"""Contract for the long form article corpus.

The frontend search validator enforces the copy rules on files under
frontend/src. These articles live in the backend and are seeded into the
database, so nothing was checking them. Roughly forty six thousand characters of
public prose with no gate is exactly where a stray em dash or a leftover
placeholder survives to production.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from blog_articles import PUBLISHED_ARTICLES  # noqa: E402

FORBIDDEN_DASHES = '—–‒―'
REQUIRED_FIELDS = ('title', 'slug', 'excerpt', 'content', 'category', 'tags')


def _body(article):
    content = article['content']
    return content(article['slug']) if callable(content) else content


class BlogArticleContractTests(unittest.TestCase):
    def test_every_article_carries_the_fields_the_seed_reads(self):
        for article in PUBLISHED_ARTICLES:
            with self.subTest(slug=article.get('slug')):
                for field in REQUIRED_FIELDS:
                    self.assertTrue(article.get(field), f'{field} is missing or empty')

    def test_slugs_are_unique_and_url_safe(self):
        slugs = [a['slug'] for a in PUBLISHED_ARTICLES]
        self.assertEqual(len(slugs), len(set(slugs)), 'duplicate slug')
        for slug in slugs:
            with self.subTest(slug=slug):
                self.assertRegex(slug, r'^[a-z0-9]+(?:-[a-z0-9]+)*$')

    def test_public_prose_contains_no_em_or_en_dashes(self):
        for article in PUBLISHED_ARTICLES:
            blob = ' '.join([
                article['title'], article['excerpt'], _body(article),
                article.get('seo_title') or '', article.get('seo_description') or '',
            ])
            with self.subTest(slug=article['slug']):
                found = sorted({c for c in blob if c in FORBIDDEN_DASHES})
                self.assertEqual(found, [], f'forbidden dash characters: {found}')

    def test_no_image_placeholder_survived_the_import(self):
        # These articles shipped with three grey placeholder panels each. A
        # published page showing a box labelled "placeholder" is worse than one
        # showing no image, so the generator was neutered on import.
        for article in PUBLISHED_ARTICLES:
            with self.subTest(slug=article['slug']):
                self.assertNotIn('placeholder', _body(article).lower())
                self.assertNotIn('data-image-slot', _body(article))

    def test_articles_are_substantial_rather_than_stubs(self):
        for article in PUBLISHED_ARTICLES:
            with self.subTest(slug=article['slug']):
                self.assertGreater(len(_body(article)), 1500)


if __name__ == '__main__':
    unittest.main()
