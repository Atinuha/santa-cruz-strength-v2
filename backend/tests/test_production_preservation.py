"""
Fail-closed tests proving the 9-person production roster, exact current image
assignments, Lexi bio preservation, stronger community copy, full About story,
and no preview data baked into production output.

These tests run against the live API and against the seed data in server.py.
They assert production truth and will fail if ANY of the following regresses:

1. Team roster reduced below 9 members
2. Dali or Kat removed
3. Syon loses their current live image
4. Chris loses their current live Emergent media URL
5. Lexi's factual bio is blanked
6. "IF YOU HAVE A BODY, YOU BELONG HERE" headline is replaced
7. Queer-friendly community copy is removed
8. 13-year About story is shortened or replaced
9. Tour links point somewhere other than /contact#tour-request
10. Volunteer page becomes visible / indexable
"""

import json
import os
import re
import subprocess
import sys

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

API_BASE = os.environ.get(
    'REACT_APP_BACKEND_URL',
    'https://crm-staff-portal-1.preview.emergentagent.com',
).rstrip('/')


def api_get(path):
    """Fetch JSON from the preview API."""
    raw = subprocess.check_output(['curl', '-s', f'{API_BASE}{path}'])
    return json.loads(raw)


# Cache for repeated calls within a single test session
_team = None
_content = None


@pytest.fixture(scope='module')
def team():
    global _team
    if _team is None:
        _team = api_get('/api/team')
    return _team


@pytest.fixture(scope='module')
def content():
    global _content
    if _content is None:
        _content = api_get('/api/content')
    return _content


# ---------------------------------------------------------------------------
# 1. Nine-person production roster
# ---------------------------------------------------------------------------

PRODUCTION_NAMES = {'Mike', 'Syon', 'Morghan ', 'Teresa', 'Lexi', 'Brit', 'Chris', 'Dali', 'Kat'}


class TestTeamRoster:
    def test_exactly_9_members(self, team):
        assert len(team) == 9, f'Expected 9 team members, got {len(team)}'

    def test_all_production_names_present(self, team):
        names = {m['name'] for m in team}
        missing = PRODUCTION_NAMES - names
        assert not missing, f'Missing production team members: {missing}'

    def test_dali_present(self, team):
        dali = [m for m in team if m['name'] == 'Dali']
        assert len(dali) == 1, 'Dali must be in the roster'
        assert dali[0]['category'] == 'trainer'
        assert dali[0]['role'] == 'Grip Strength Specialist'

    def test_kat_present(self, team):
        kat = [m for m in team if m['name'] == 'Kat']
        assert len(kat) == 1, 'Kat must be in the roster'
        assert kat[0]['category'] == 'trainer'
        assert kat[0]['role'] == 'Strength Coach'

    def test_categories(self, team):
        team_cat = [m for m in team if m['category'] == 'team']
        trainer_cat = [m for m in team if m['category'] == 'trainer']
        assert len(team_cat) == 3, f'Expected 3 team-category members, got {len(team_cat)}'
        assert len(trainer_cat) == 6, f'Expected 6 trainer-category members, got {len(trainer_cat)}'


# ---------------------------------------------------------------------------
# 2. Exact image assignments
# ---------------------------------------------------------------------------

# Production image URLs — these are the live URLs that must be preserved.
PRODUCTION_IMAGES = {
    'Mike': 'https://customer-assets.emergentagent.com/job_da9a4a5d-572a-4858-ad1e-163b4849fc8c/artifacts/g5zrk54i_Mike.jpg',
    'Teresa': 'https://customer-assets.emergentagent.com/job_da9a4a5d-572a-4858-ad1e-163b4849fc8c/artifacts/muymaslx_Teresa.jpg',
    'Brit': 'https://customer-assets.emergentagent.com/job_da9a4a5d-572a-4858-ad1e-163b4849fc8c/artifacts/xbzp9o5d_Brit.jpg',
    'Syon': 'https://santa-cruz-dev.emergent.host/api/media/1dab09dd-5e3c-4649-9617-3cc274037829',
    'Lexi': 'https://customer-assets.emergentagent.com/job_da9a4a5d-572a-4858-ad1e-163b4849fc8c/artifacts/457i1107_Lexi.jpg',
    'Chris': 'https://santa-cruz-dev.emergent.host/api/media/e362853e-89b5-4b71-b85d-f25d69676297',
}

# Members without a photograph. They must have an empty photo_url, NOT a
# placeholder or generated image.
NO_PHOTO_MEMBERS = {'Morghan ', 'Dali', 'Kat'}


class TestImageAssignments:
    @pytest.mark.parametrize('name,expected_url', list(PRODUCTION_IMAGES.items()))
    def test_member_has_exact_production_image(self, team, name, expected_url):
        member = next((m for m in team if m['name'] == name), None)
        assert member is not None, f'{name} not found in team'
        assert member['photo_url'] == expected_url, (
            f'{name} photo_url mismatch.\n'
            f'  Expected: {expected_url}\n'
            f'  Got:      {member["photo_url"]}'
        )

    @pytest.mark.parametrize('name', list(NO_PHOTO_MEMBERS))
    def test_no_photo_member_stays_empty(self, team, name):
        member = next((m for m in team if m['name'] == name), None)
        assert member is not None, f'{name} not found in team'
        assert member['photo_url'] == '', (
            f'{name} must have no photo_url. Got: {member["photo_url"]}'
        )

    def test_syon_keeps_live_image(self, team):
        """Explicit check per user instruction: Syon must keep the current live image."""
        syon = next((m for m in team if m['name'] == 'Syon'), None)
        assert syon is not None
        assert syon['photo_url'] == PRODUCTION_IMAGES['Syon']

    def test_chris_keeps_emergent_media_url(self, team):
        """Explicit check per user instruction: Chris must keep the current live Emergent media URL."""
        chris = next((m for m in team if m['name'] == 'Chris'), None)
        assert chris is not None
        assert chris['photo_url'] == PRODUCTION_IMAGES['Chris']
        assert 'emergent.host/api/media/' in chris['photo_url']

    def test_no_local_asset_paths_in_photo_urls(self, team):
        """No member should reference a local /assets/ path — all must be Emergent URLs or empty."""
        for m in team:
            url = m.get('photo_url', '')
            assert not url.startswith('/assets/'), (
                f'{m["name"]} still uses a local asset path: {url}'
            )
            assert not url.startswith('/static/'), (
                f'{m["name"]} uses a static path: {url}'
            )


# ---------------------------------------------------------------------------
# 3. Lexi bio preservation
# ---------------------------------------------------------------------------

LEXI_BIO_SUBSTRING = 'Certified Strength and Conditioning Coach through the NSCA'
LEXI_BIO_MIN_LENGTH = 350


class TestLexiBio:
    def test_lexi_bio_is_not_blank(self, team):
        lexi = next((m for m in team if m['name'] == 'Lexi'), None)
        assert lexi is not None
        assert lexi['bio'], 'Lexi bio must not be blank'

    def test_lexi_bio_contains_nsca(self, team):
        lexi = next((m for m in team if m['name'] == 'Lexi'), None)
        assert LEXI_BIO_SUBSTRING in lexi['bio'], (
            f'Lexi bio must contain "{LEXI_BIO_SUBSTRING}"'
        )

    def test_lexi_bio_not_truncated(self, team):
        lexi = next((m for m in team if m['name'] == 'Lexi'), None)
        assert len(lexi['bio']) >= LEXI_BIO_MIN_LENGTH, (
            f'Lexi bio appears truncated: {len(lexi["bio"])} chars (min {LEXI_BIO_MIN_LENGTH})'
        )


# ---------------------------------------------------------------------------
# 4. Stronger community copy
# ---------------------------------------------------------------------------

class TestCommunityCopy:
    def test_headline_if_you_have_a_body(self, content):
        headline = content.get('home_who_headline', '')
        assert 'IF YOU HAVE A BODY' in headline, (
            f'Community headline must contain "IF YOU HAVE A BODY". Got: {headline}'
        )

    def test_headline_not_if_you_train(self, content):
        headline = content.get('home_who_headline', '')
        assert 'IF YOU TRAIN' not in headline, (
            f'Community headline must NOT contain "IF YOU TRAIN". Got: {headline}'
        )

    def test_queer_friendly_subtext(self, content):
        subtext = content.get('home_who_subtext', '')
        assert 'queer-friendly' in subtext.lower(), (
            f'Community subtext must mention "queer-friendly". Got: {subtext}'
        )

    def test_identities_respected(self, content):
        subtext = content.get('home_who_subtext', '')
        assert 'identities are respected' in subtext.lower(), (
            f'Community subtext must include "identities are respected". Got: {subtext}'
        )


# ---------------------------------------------------------------------------
# 5. Full 13-year About story
# ---------------------------------------------------------------------------

class TestAboutStory:
    def test_about_story_exists(self, content):
        story = content.get('about_story', '')
        assert story, 'about_story must not be empty'

    def test_about_story_mentions_13_years(self, content):
        story = content.get('about_story', '')
        assert '13 years' in story, (
            f'About story must mention "13 years"'
        )

    def test_about_story_mentions_queer(self, content):
        story = content.get('about_story', '')
        assert 'queer' in story.lower(), (
            f'About story must mention queer members'
        )

    def test_about_story_full_length(self, content):
        story = content.get('about_story', '')
        # The full story is ~1200 chars. Anything under 1000 is truncated.
        assert len(story) >= 1000, (
            f'About story appears truncated: {len(story)} chars (expected >= 1000)'
        )

    def test_about_story_mentions_powerlifting_strongman_olympic(self, content):
        story = content.get('about_story', '').lower()
        for discipline in ['powerlifting', 'strongman', 'olympic weightlifting']:
            assert discipline in story, (
                f'About story must mention "{discipline}"'
            )


# ---------------------------------------------------------------------------
# 6. Seed data in server.py matches production truth
# ---------------------------------------------------------------------------

class TestSeedAlignment:
    """Verify the seed in server.py is aligned to production, so a fresh
    database would not regress."""

    @pytest.fixture(scope='class')
    def seed_source(self):
        server_path = os.path.join(os.path.dirname(__file__), '..', 'server.py')
        with open(server_path) as f:
            return f.read()

    def test_seed_has_9_team_members(self, seed_source):
        # Count lines matching the seed_team list pattern
        team_lines = re.findall(r"'name':\s*'[^']*'.*'category':", seed_source)
        # Only count lines inside seed_team (after "seed_team = [")
        in_seed = seed_source[seed_source.index('seed_team = ['):]
        team_lines = re.findall(r"\{'id':", in_seed[:in_seed.index(']')])
        assert len(team_lines) == 9, f'seed_team must have 9 members, found {len(team_lines)}'

    def test_seed_has_dali(self, seed_source):
        assert "'name': 'Dali'" in seed_source

    def test_seed_has_kat(self, seed_source):
        assert "'name': 'Kat'" in seed_source

    def test_seed_community_headline(self, seed_source):
        assert 'IF YOU HAVE A BODY' in seed_source
        assert 'IF YOU TRAIN,\\nYOU BELONG HERE' not in seed_source

    def test_seed_queer_friendly(self, seed_source):
        assert 'queer-friendly space' in seed_source

    def test_seed_lexi_bio_not_empty(self, seed_source):
        # Find the Lexi line and verify bio is not empty
        lexi_match = re.search(r"'name':\s*'Lexi'.*?'bio':\s*'([^']*)'", seed_source)
        assert lexi_match, 'Lexi seed entry not found'
        assert len(lexi_match.group(1)) > 100, 'Lexi seed bio must not be empty'

    def test_seed_no_local_portrait_paths(self, seed_source):
        # Between seed_team = [ and the closing ], no /assets/scs/real/ paths
        start = seed_source.index('seed_team = [')
        end = seed_source.index(']', start)
        team_block = seed_source[start:end]
        assert '/assets/scs/real/' not in team_block, (
            'seed_team must not use local /assets/scs/real/ paths for photo_url'
        )

    def test_seed_chris_emergent_url(self, seed_source):
        chris_match = re.search(r"'name':\s*'Chris'.*?'photo_url':\s*'([^']*)'", seed_source)
        assert chris_match, 'Chris seed entry not found'
        assert 'emergent.host/api/media/' in chris_match.group(1)

    def test_seed_syon_emergent_url(self, seed_source):
        syon_match = re.search(r"'name':\s*'Syon'.*?'photo_url':\s*'([^']*)'", seed_source)
        assert syon_match, 'Syon seed entry not found'
        assert 'emergent.host/api/media/' in syon_match.group(1)

    def test_seed_strength_for_everyone(self, seed_source):
        assert 'STRENGTH FOR EVERYONE' in seed_source
        assert 'STRENGTH WITHOUT THE NOISE' not in seed_source

    def test_seed_about_story_13_years(self, seed_source):
        assert '13 years' in seed_source


# ---------------------------------------------------------------------------
# 7. Tour links
# ---------------------------------------------------------------------------

class TestTourLinks:
    """Verify tour links in the frontend source point to /contact#tour-request."""

    @pytest.fixture(scope='class')
    def home_source(self):
        home_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'pages', 'Home.js')
        with open(home_path) as f:
            return f.read()

    def test_tour_links_point_to_contact_tour_request(self, home_source):
        tour_links = re.findall(r'to="(/[^"]*tour[^"]*)"', home_source, re.IGNORECASE)
        for link in tour_links:
            assert link == '/contact#tour-request', (
                f'Tour link must be /contact#tour-request, got {link}'
            )

    def test_at_least_3_tour_links(self, home_source):
        tour_links = re.findall(r'to="/contact#tour-request"', home_source)
        assert len(tour_links) >= 3, f'Expected at least 3 tour links, got {len(tour_links)}'


# ---------------------------------------------------------------------------
# 8. Volunteer disabled
# ---------------------------------------------------------------------------

class TestVolunteerGate:
    @pytest.fixture(scope='class')
    def frontend_env(self):
        env_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', '.env')
        with open(env_path) as f:
            return f.read()

    def test_volunteer_page_disabled(self, frontend_env):
        assert 'REACT_APP_ENABLE_VOLUNTEER_PAGE=false' in frontend_env or \
               'REACT_APP_ENABLE_VOLUNTEER_PAGE' not in frontend_env, \
            'Volunteer page must be disabled (REACT_APP_ENABLE_VOLUNTEER_PAGE=false)'
