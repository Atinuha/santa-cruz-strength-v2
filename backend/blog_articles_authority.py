"""
Authority articles for Santa Cruz Strength.

Two facility-fit articles written as evaluation questions rather than lead
magnets: "will this gym support me competing" and "will this gym let me train
around a restriction".

Shape is identical to PUBLISHED_ARTICLES in blog_articles.py. No _ph() image
slots, no invented facts, zero em/en dashes. Federation rules in the meet
article are sourced from the USA Powerlifting rulebook v2026.1 (effective
January 1, 2026), fetched and read directly rather than recalled.
"""

AUTHORITY_ARTICLES = [
    # ──────────────────────────────────────────────────
    # 1. Getting Back Under the Bar After an Injury
    # ──────────────────────────────────────────────────
    {
        'title': 'Getting Back Under the Bar After an Injury',
        'slug': 'return-to-lifting-after-injury',
        'excerpt': 'Returning to load after an injury is two problems: a medical one and a training one. Here is where the line sits, and what a gym can actually do on the training side of it.',
        'category': 'Training Tips',
        'tags': ['injury', 'returning to lifting', 'coaching', 'Santa Cruz'],
        'seo_title': 'Back to Lifting After an Injury | Santa Cruz Strength',
        'seo_description': 'How to return to lifting after an injury: when to see a physical therapist first, how to deload, and what a gym and coach can and cannot do.',
        'content': lambda slug: f"""
<p>Getting back to lifting after an injury is two separate problems, and mixing them up is what sends people backward. The first is a medical question: whether the tissue is ready to be loaded at all, and under what limits. That belongs to a doctor or a physical therapist, and nobody on a gym floor can answer it. The second is a training question: which movements you can load today, how much, how often, and how to add to it week over week without stirring anything up. That second problem is what a coach and a well equipped room are for, and it is the only one this article covers.</p>

<h2>See a professional first if any of this is true</h2>

<p>This is the part most articles bury. Do not book a gym tour before you have a medical opinion if any of the following applies to you:</p>

<ul>
<li>The injury has never been formally evaluated.</li>
<li>You were given a restriction on loading a joint or a region and nobody has lifted it.</li>
<li>You have pain at rest, pain at night, or pain that is worse this week than it was last week.</li>
<li>You have numbness, tingling, or weakness that arrived suddenly.</li>
<li>You are partway through physical therapy and your therapist has not yet started talking with you about the gym.</li>
<li>Something moves, catches, or gives way in a manner you cannot explain.</li>
</ul>

<p>None of those are gym decisions and none of them get better because someone hands you a program. The American Physical Therapy Association runs <a href="https://www.choosept.com/">ChoosePT, its public directory for finding a physical therapist</a>, if you do not already have one. If you have a therapist, the most useful thing you can bring back to a gym is their written guidance on what you are cleared to do.</p>

<p>A gym is not a clinic and a coach is not a clinician. Lifting is not a treatment for an injury and this article does not claim it is. What follows assumes you have already been cleared to train and you are working out how.</p>

<h2>What a coach and a gym can actually do</h2>

<p>Four things, and they are not glamorous.</p>

<p><strong>Load management.</strong> Deciding how much total work you do in a session and across a week, and keeping that number honest when you feel good and want more. Most setbacks in a return to training are not caused by one heavy set. They are caused by a good week that turned into three good weeks of adding something every session.</p>

<p><strong>Movement selection.</strong> Finding a version of a pattern you can perform without symptoms, so you can keep training while the restricted version waits. This is the single biggest reason equipment matters during a return.</p>

<p><strong>Progression.</strong> Changing one variable at a time and giving it long enough to tell you something. Load, reps, sets, range, tempo, frequency. Change two at once and you have no idea which one you owe a bad session to.</p>

<p><strong>Patience, structurally enforced.</strong> Not as an attitude. As a plan on paper that says what you are allowed to do this week, so the decision is not made by how you feel at 6pm on a Tuesday.</p>

<h2>Movement selection is substitution, not subtraction</h2>

<p>The instinct after an injury is to remove exercises. That leaves you with a shorter list and no path back onto the full one. The better question is whether some version of the same pattern is available to you right now.</p>

<p>Most patterns have a dozen variations, and the variables are usually implement, position, range, and stance. A barbell across the back is one way to squat. A different bar, a different bar position, a narrower or wider stance, a shorter range worked against pins, or a dumbbell or kettlebell held in front are all still squatting. The same is true for pressing, hinging, rowing, and carrying. A room with racks, platforms, several bar types, dumbbells and kettlebells gives you more places to stand on that ladder than a room with a fixed machine circuit does.</p>

<p>[FACT NEEDED: which specialty bars are actually on the floor, by name, confirmed by staff. A safety squat bar or a trap bar is often the specific piece of equipment that makes a return possible, and naming them is more useful than the category.]</p>

<p>Pick the variation you can do today with clean technique and no symptoms during or after, then work it until the restricted version is available again. That is progress even when the number on the bar is embarrassing.</p>

<h2>How to deload after time off lifting</h2>

<p>Start lower than your ego wants and lower than your first session suggests you could handle. A practical rule: every set in your first two weeks back should end with you certain you could have done at least three more reps. Not one more. Three.</p>

<p>The reason is timing. Muscle tells you it was overloaded the next morning. Tendons, joints, and healing tissue can take a day or two longer to file the complaint, which means the session that felt fine is not evidence of anything yet. If you calibrate off how you feel during the set, you will always be one week ahead of the feedback.</p>

<p>Some things that help:</p>

<ul>
<li>Keep the first month boring. Same movements, same days, small increases.</li>
<li>Add load or add reps, never both in the same week.</li>
<li>Judge a week by whether you completed every planned session, not by the heaviest set in it.</li>
<li>Keep a log with a symptom note next to each session. Two lines is enough. It is the only way to spot a slow trend before it becomes an event.</li>
<li>Warm up longer than you used to and do not treat that as a sign of decline. It is a sign you are taking the first working set seriously.</li>
</ul>

<p>If you are also rebuilding a training habit from scratch, the frequency question is worth its own read: <a href="/blog/how-many-days-a-week-should-you-lift">how many days a week you should lift</a> covers how to pick a schedule you will actually keep.</p>

<h2>How long until your strength comes back</h2>

<p>Nobody can give you a number, and you should be suspicious of anyone who does. The honest answer is that it depends on how long you were out, what you were able to keep doing while you were out, what the restriction actually was, your age, your sleep, and how much you were lifting before. A stranger on the internet has none of that information about you.</p>

<p>What is more useful is knowing what to watch. Two things usually return before the number on the bar does: the movement starts to feel like yours again, and your recovery between sessions stops being the limiting factor. When both of those are true, load tends to follow on its own. Chasing the number before they are true is how people end up back where they started.</p>

<p>So measure something you control. Sessions completed this month. Consecutive weeks without a symptom flag in your log. Number of movements back on the list. Those go up in a straight line when you are doing this correctly, and they are the leading indicators that the number is coming.</p>

<h2>Training around a restriction is mostly a facility question</h2>

<p>This is the part nobody tells you, and it is the reason a physical therapy clinic's blog cannot fully answer this question. Once you are cleared, the constraints on your return are practical ones. Can you get to the specific implement you need without waiting. Can you set up a rack at a height that works for a shortened range. Can you take three minutes between sets without someone hovering. Can you train at a time when the floor is quiet enough to work slowly. Is there a person present you can ask a question.</p>

<p>Those are all gym questions, not injury questions, and they are worth answering before you sign anything. Santa Cruz Strength has racks, lifting platforms, barbells, plates, specialty bars, dumbbells, kettlebells and conditioning equipment, which is what makes the substitution approach above possible in practice. There are staffed hours during the week and on weekends, plus 24/7 member access through the app, so training off-peak while you rebuild is a real option rather than a theory. <a href="/personal-training">Personal training</a> is available if you want someone building the progression rather than doing it yourself, and it is optional rather than bundled.</p>

<p>[FACT NEEDED: whether any coach on staff holds a credential or has experience relevant to working with clients coming out of physical therapy, confirmed by Mike. This should not be stated in copy until it is confirmed and named.]</p>

<p>If you are weighing coached sessions against training on your own, <a href="/blog/personal-trainer-vs-open-gym-santa-cruz">personal training versus open gym in Santa Cruz</a> lays out the tradeoff. If you are returning later in life rather than after a single event, <a href="/blog/strength-training-after-40-santa-cruz">strength training after 40</a> covers a different but related set of adjustments.</p>

<h2>What to ask a gym before you join</h2>

<p>Take these to any facility you are considering, here or anywhere else. The answers tell you more than the tour does.</p>

<ul>
<li>Can I set up in a rack and take my time, or is there pressure to move on at busy hours?</li>
<li>What is the quietest time on the floor during the week?</li>
<li>Which specialty bars do you have, by name?</li>
<li>Are there adjustable pins or blocks so I can work a shortened range?</li>
<li>Is there someone on the floor during the hours I would train?</li>
<li>Can I train here without buying coaching, and can I add coaching later without changing my membership?</li>
<li>What happens to my membership if I have a setback and need to stop for a month?</li>
</ul>

<p>That last one matters more than people expect during a return. Santa Cruz Strength publishes every membership tier and its terms, including the 30-day cancellation notice, on the <a href="/join">memberships page</a> so you can read them before anyone asks you for a card. And you can <a href="/contact">book a free facility tour</a> to walk the floor and check the equipment list against your own restrictions before deciding anything. No commitment, no card required.</p>

<h2>Frequently Asked Questions</h2>

<h3>Can I lift while I am still in physical therapy?</h3>
<p>That is a question for your physical therapist, not for a gym. Many people do train alongside physical therapy with their therapist's guidance, and many are asked to wait. Ask directly, and ask them to write down what you are and are not cleared to load.</p>

<h3>Will lifting fix my injury?</h3>
<p>Nothing here claims that it will. Lifting is training, not treatment. Whether loading has a role in your particular situation is a clinical question, and the person who evaluated you is the one who can answer it.</p>

<h3>How much weight should I start with?</h3>
<p>Less than you think. A workable starting point is a load you could perform for at least three more reps than you actually do on every set, held there for the first couple of weeks. If that feels absurdly easy, it is probably about right.</p>

<h3>Should I wait until the restriction is completely gone before I train?</h3>
<p>Once you have been cleared, usually not. Training the movements you can do keeps the rest of you from detraining while the restricted pattern waits. What you should not do is decide on your own that a restriction has expired.</p>

<h3>Is it normal to feel much weaker than I was?</h3>
<p>Feeling weaker after time off is expected and it is not a verdict on how this goes. The useful response is to log sessions completed rather than the weight on the bar for the first month, because sessions completed is what actually produces the weight later.</p>

<h3>How do I know if I am progressing too fast?</h3>
<p>Watch the day after and the day after that, not the session itself. Symptoms that show up 24 to 48 hours later, or a slow week over week creep in how long it takes to feel ready to train again, are the two signals worth acting on. When either appears, hold the current load rather than adding, and if it continues, go back to the person who cleared you.</p>

<h3>Do I need a coach for this?</h3>
<p>Not necessarily. You need a plan you did not write in the moment. A coach is one way to get that, and a written progression you commit to in advance is another. What does not work is deciding each session's load based on how the warmup felt.</p>

<p>If you want to look at the floor before you decide anything, <a href="/contact">book a free tour</a>. Bring your restrictions and your questions, and check the equipment against them yourself.</p>
""",
    },

    # ──────────────────────────────────────────────────
    # 2. Your First Powerlifting Meet
    # ──────────────────────────────────────────────────
    {
        'title': 'Your First Powerlifting Meet: A Practical Guide',
        'slug': 'first-powerlifting-meet-guide',
        'excerpt': 'Membership, registration, weigh-ins, flights, attempt selection and the commands. What actually happens between deciding to compete and standing on the platform.',
        'category': 'Training Tips',
        'tags': ['powerlifting', 'competition', 'usapl', 'Santa Cruz'],
        'seo_title': 'Your First Powerlifting Meet | Santa Cruz Strength',
        'seo_description': 'How to enter your first powerlifting meet: federation membership, registration, weigh-in, flights, attempt selection, the commands, and what to bring.',
        'content': lambda slug: f"""
<p>Entering your first powerlifting meet takes four steps. You buy a current membership in the federation sanctioning the meet, you register for one specific meet through that meet's own entry page, you show up on meet day for weigh-in and equipment check roughly two hours before your session starts, and then you take three attempts each at squat, bench press and deadlift under referee commands. Everything else is detail. This guide covers the detail, because the detail is where first-time lifters get caught.</p>

<p>One note before anything else: federation rules are specific and they change. Every rule below is drawn from the USA Powerlifting rulebook, version 2026.1, effective January 1, 2026, and USA Powerlifting publishes newer versions during the year. Read the <a href="https://www.usapowerlifting.com/rulebook" rel="nofollow">current USA Powerlifting rulebook at usapowerlifting.com</a> yourself before you enter, and if you are competing in a different federation, read theirs instead. Do not take a rule from a blog, including this one, as final.</p>

<h2>First, decide the sport, then the federation</h2>

<p>If you are still choosing between strength sports, that decision comes before this article. <a href="/blog/powerlifting-vs-olympic-weightlifting-vs-strongman">Powerlifting versus Olympic weightlifting versus strongman</a> covers the movements and training demands of each. This guide starts after you have picked powerlifting.</p>

<p>Powerlifting has multiple federations in the United States. They differ in rules, in drug testing policy, in what equipment is permitted, and in how meets are run. USA Powerlifting is one of the larger ones and is drug tested. For California meets, USA Powerlifting California maintains a state presence and points to the national calendar for scheduled events; you can start at <a href="https://usaplcalifornia.com/">USA Powerlifting California</a>. Whichever federation you pick, the rulebook you read has to be that federation's rulebook.</p>

<p>Pick a local meet for your first one. Travel adds cost, sleep disruption, and a weigh-in in an unfamiliar place, and none of that helps you lift.</p>

<h2>Do I need a membership to compete?</h2>

<p>For USA Powerlifting, yes. The rulebook is unambiguous: in order to compete in any USA Powerlifting event, lifters must have a current USA Powerlifting membership. That requirement covers lifters, referees, meet directors and administrators at sanctioned competitions.</p>

<p>Two timing details worth knowing. Annual membership runs January 1 through December 31 and expires at the end of the calendar year, so a membership bought in March does not give you twelve months. The exception is that a membership purchased on or after November 1 is valid through December 31 of the following year. Check the current terms on the <a href="https://usaplcalifornia.com/membership">USA Powerlifting membership page</a> before you buy, and note that memberships are sold as final with no refunds.</p>

<p>The third detail is the one that catches people at the door: your membership card is what counts as proof of membership at the meet, and a payment receipt on its own is not. Save the card, print it or have it on your phone, and do not assume the email with the charge on it will do.</p>

<p>Membership fees are set by the federation and change, so check the current price at the source rather than trusting a number in an article.</p>

<h2>Registering, and picking a division and weight class</h2>

<p>Registration happens through the individual meet, not through the federation as a whole. The meet's entry page tells you the date, the venue, the entry fee, the divisions offered, the deadline, and whether the meet requires a qualifying total. Some events require a qualifying total and some do not; the meet's own entry information is what says which.</p>

<p>On the entry you will select an age division, a weight class, and whether you are lifting raw or equipped.</p>

<p><strong>Weight class.</strong> USA Powerlifting lists twelve weight classes for women and twelve for men, defined in kilograms with a pound equivalent, plus separate youth classes for lifters under 14. The exact ranges are in the rulebook and you should read them rather than work from memory. For a first meet, enter the class you already are. Do not cut weight for your first competition. You have enough new variables on that day.</p>

<p><strong>Raw or equipped.</strong> The rulebook defines raw lifting, also called unequipped or classic, as competing using only undergarments, a t-shirt, a non-supportive singlet, shoes, socks, a belt, wrist wraps and knee sleeves. Equipped lifting means using supportive gear such as a squat suit, a bench press shirt, a deadlift suit, or knee wraps, and those supportive items have to be on the federation's approved list. Almost every first meet is raw.</p>

<h2>Meet day: weigh-in and equipment check</h2>

<p>Weigh-in is the part first timers most often plan wrong, because it is not a fixed hour of the morning. It is defined relative to your session. Under USA Powerlifting rules, weigh-in for a session begins two hours before that session's scheduled start of lifting and lasts 90 minutes, with 30 minutes between the end of weigh-in and the first lift. Weigh-ins are not permitted to begin earlier than two hours out under any circumstances, and every lifter in the session has to attend.</p>

<p>Equipment check happens in the same window. Referees inspect your gear against the rules, and the deadline is 30 minutes before your session's scheduled start. Bring everything you intend to wear on the platform. It is preferred, though not required, that you get equipment check done before you weigh in.</p>

<p>You also submit your opening attempts for all three lifts at the weigh-in. Have those numbers written down before you arrive. Deciding them in a room while someone waits with a clipboard is not when you want to be doing arithmetic.</p>

<h2>Flights, rounds and the clock</h2>

<p>You will not be at the venue for one continuous performance. Lifters are grouped into flights, and a flight under USA Powerlifting rules is between 6 and 15 lifters. Flights are arranged into sessions, and no session may contain more than 45 lifters per platform.</p>

<p>Within a flight, the rounds system applies: everyone takes their first attempt in the first round, everyone takes their second in the second round, and everyone takes their third in the third round. So you lift, then roughly a dozen other people lift, then you lift again. Your job between attempts is to stay warm without burning yourself out, which is a skill worth practicing in the gym before meet day.</p>

<p>Once the chief referee announces that the bar is loaded and the announcer calls your name, a 60-second clock starts. You need to have started your attempt inside it. That is much less time than it sounds like when you are also chalking up and getting a belt tight, which is why lifters who have done this before are already standing near the platform when their name is called.</p>

<h2>Attempt selection</h2>

<p>Each competitor gets three attempts on each lift, and your total is the sum of your best successful attempt on each of the three. A successful attempt in all three lifts is required to earn a total at all. That single sentence should drive every decision you make about your openers.</p>

<p>You are permitted one change of weight on your opening attempt of each lift, higher or lower, and there are deadlines on when that change can be submitted. If you are in the first flight, the change can be made up to three minutes before the start of the first round of that lift. Later flights get the equivalent privilege relative to the preceding flight. Changes have to be submitted to a scoring table official by you or your coach.</p>

<p>Coaching opinion rather than rule, and it is the most common advice given to first timers for a reason: pick an opener you could hit for a clean triple on your worst day. The opener is not a lift you are trying to make. It is the lift that gets you a total. Take your risk on the third attempt, where a miss costs you nothing you had already secured.</p>

<p>If you miss all three attempts on a lift, you have no total, but you are not automatically ejected. You are required to inform the scoring table whether you intend to withdraw or continue, and there is a deadline on that decision. Know that in advance so a bad squat does not turn into a confusing afternoon.</p>

<h2>The commands</h2>

<p>More first meets are lost to commands than to strength. Each lift has its own, and they are not the same shape.</p>

<p><strong>Squat.</strong> You unrack, get set, and wait for the chief referee's audible command to squat. After you finish, you wait for the rack command before returning the bar. Moving before the squat command or racking before the rack command is a disqualified attempt.</p>

<p><strong>Bench press.</strong> Three commands. You wait for start, lower the bar to the chest or abdominal area and hold it motionless until you get press, then press it and wait for rack before returning the bar. Only one press attempt is allowed, and starting the press before the press command disqualifies it.</p>

<p><strong>Deadlift.</strong> There is no start command. You pull whenever you are ready. The only command comes at the top: once the bar is motionless and you are in the finished position, the referee signals down, and you have to keep control of the bar on the way back to the platform. Letting go early, or slamming it down, is how a good pull becomes a red light.</p>

<p>Practice the commands in training with someone calling them, at real training weights, for months before the meet. Not the week of. The pause on a bench press command in particular changes what the lift feels like, and finding that out on the platform is expensive.</p>

<h2>What to bring</h2>

<ul>
<li>Your membership card, as a printout or on your phone. A payment receipt alone will not do.</li>
<li>Photo identification.</li>
<li>Singlet, t-shirt, socks, shoes, and any belt, wrist wraps and knee sleeves you plan to use, all clean and in good repair. Items that are torn or in disrepair get rejected at equipment check.</li>
<li>Your written openers for all three lifts.</li>
<li>Food you have eaten before, and more of it than you think. You may be there most of the day.</li>
<li>Water, and something to sit on.</li>
<li>Anything you normally use to warm up, since the warmup room will be busy and unfamiliar.</li>
</ul>

<h2>How long does a powerlifting meet take?</h2>

<p>Longer than the lifting. Your day is bounded by your session, not by the whole event, but the structure explains why it stretches: weigh-in opens two hours before your session starts, a session can carry up to 45 lifters per platform, and every lifter in your flight takes a turn between each of your three attempts on each of the three lifts. Plan on the entire day being gone and treat any earlier finish as a bonus. Meets also run behind. Nobody can promise you a duration, and the meet director's schedule is the only estimate worth having.</p>

<h2>Training for it in Santa Cruz</h2>

<p>Meet prep needs a room where you can squat heavy in a rack, bench with a competent spotter, and pull off a platform without apologizing to anyone. Santa Cruz Strength has racks, lifting platforms, barbells, plates, specialty bars, dumbbells and kettlebells, and 24/7 member access through the app for lifters running long sessions outside staffed hours.</p>

<p>[FACT NEEDED: whether the gym has a competition specification bench, a deadlift bar, or calibrated plates, confirmed by Mike. Training on competition specification equipment before a meet is a real advantage and worth naming if it exists.]</p>

<p>[FACT NEEDED: whether any coach on staff has competed in or handled a lifter at a sanctioned powerlifting meet, confirmed by Mike. Do not state or imply meet experience in copy until this is confirmed.]</p>

<p><a href="/personal-training">Personal training</a> is available if you want someone building the peaking block and calling commands during your last few weeks. If you have never trained in a barbell focused gym before, <a href="/blog/first-visit-powerlifting-gym">what to expect on a first visit to a powerlifting gym</a> covers the floor itself, and <a href="/blog/personal-trainer-vs-open-gym-santa-cruz">personal training versus open gym</a> covers whether you need coaching at all.</p>

<p>You can <a href="/contact">book a free facility tour</a> and walk the platforms before deciding anything, and every membership tier and its terms are published on the <a href="/join">memberships page</a>.</p>

<h2>Frequently Asked Questions</h2>

<h3>Do I need a USAPL membership to compete?</h3>
<p>Yes, for USA Powerlifting events. The rulebook states that lifters must have a current USA Powerlifting membership in order to compete in any USA Powerlifting event. Other federations set their own requirements, so check the rules of whichever one is sanctioning your meet.</p>

<h3>How strong do I need to be to enter a local meet?</h3>
<p>Entry is a matter of membership and registration rather than a strength standard. Some events do require a qualifying total, and the meet's entry information will say so. For an open local meet, there is generally nothing to qualify for.</p>

<h3>What are the powerlifting meet rules for beginners?</h3>
<p>They are the same rules as for everyone else, which is why reading the rulebook is the actual answer. The three that most affect a first timer are the commands for each lift, what apparel is permitted, and the weigh-in and equipment check deadlines relative to your session start.</p>

<h3>What happens if I miss all three attempts on a lift?</h3>
<p>You do not earn a total, since a successful attempt in all three lifts is required for one. You are not automatically finished, but you have to tell the scoring table whether you are withdrawing or continuing, and there is a deadline for that. Ask a meet official as soon as it happens.</p>

<h3>Can my coach be with me on the floor?</h3>
<p>At regional, national, international and pro championships, USA Powerlifting requires coaches to hold a current membership in order to access lifter areas such as the warmup room, staging area and the coaching area near the platform. Local meet access varies, so ask the meet director in advance.</p>

<h3>Should I cut weight for my first meet?</h3>
<p>No. Enter the class you already are. A weight cut adds a serious variable to a day that is already entirely new to you, and your first meet is for learning the process and earning a total.</p>

<h3>How far out should I pick a meet?</h3>
<p>Far enough to run a full training block into it and to get your membership and registration done well before the deadline. Registration for popular local meets can close early, so pick the meet first and build the training backward from its date.</p>
""",
    },
]
