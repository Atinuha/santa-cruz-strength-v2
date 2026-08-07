"""
10 published Santa Cruz Strength blog articles.
Full long-form content, FAQ sections, image placeholder slots, internal links.
Zero em/en dashes. No invented claims, testimonials, or CMS scaffolding.
"""


def _ph(slot, slug, label):
    """No image placeholder is rendered.

    These articles were authored with three grey placeholder panels each, thirty
    in total. A published article showing a box that says "placeholder" is worse
    than one showing no image at all, and the media policy forbids inventing a
    photograph to fill the gap. When a real photograph exists for an article,
    add it deliberately rather than restoring a generated slot.
    """
    return ''


PUBLISHED_ARTICLES = [
    # ──────────────────────────────────────────────────
    # 1. Beginner Strength Training in Santa Cruz
    # ──────────────────────────────────────────────────
    {
        'title': 'Beginner Strength Training in Santa Cruz',
        'slug': 'beginner-strength-training-santa-cruz',
        'excerpt': 'Starting a strength training program does not require prior experience. Here is what the process actually looks like for a beginner in Santa Cruz.',
        'category': 'Getting Started',
        'tags': ['beginners', 'strength training', 'Santa Cruz', 'getting started'],
        'seo_title': 'Beginner Strength Training in Santa Cruz | Santa Cruz Strength',
        'seo_description': 'A practical guide to starting strength training in Santa Cruz. What beginners actually experience, what equipment to expect, and how to build a foundation.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>Strength training is one of the most studied and well-supported forms of exercise for improving health, body composition, and functional capability. If you are in Santa Cruz and considering starting, here is what to expect and how to approach the first several months.</p>

<h2>What Strength Training Actually Means</h2>

<p>Strength training is the practice of using external resistance, typically barbells, dumbbells, and machines, to develop muscular force. It is different from cardio-focused exercise in both method and outcome. Where running or cycling primarily develop aerobic endurance, strength training builds the capacity to produce force against resistance.</p>

<p>For beginners, the practical application is straightforward: learn a small number of compound movements, perform them with gradually increasing load, and repeat consistently over months.</p>

<h2>The Compound Movements That Matter</h2>

<p>Most effective beginner programs center on five to seven fundamental movement patterns:</p>

<ul>
<li><strong>Squat</strong>: Loading the legs and trunk through a full range of motion. Typically performed with a barbell on the back or front of the shoulders.</li>
<li><strong>Deadlift</strong>: Picking weight up from the floor. Develops the posterior chain including the glutes, hamstrings, and back.</li>
<li><strong>Bench press</strong>: Horizontal pressing. Builds the chest, shoulders, and triceps.</li>
<li><strong>Overhead press</strong>: Vertical pressing. Targets the shoulders and upper body stability.</li>
<li><strong>Row</strong>: Horizontal pulling. Strengthens the upper back and counterbalances pressing movements.</li>
</ul>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<p>These movements are prioritized because they train multiple muscle groups simultaneously and produce the broadest adaptation in the shortest time. Isolation exercises like bicep curls or leg extensions have a place but are secondary to compound work for beginners.</p>

<h2>What the First Month Looks Like</h2>

<p>The first four weeks of strength training are primarily about motor learning. Your body is figuring out how to coordinate the movement patterns under load. Strength gains during this period are largely neurological, meaning your muscles are learning to fire more efficiently rather than growing significantly in size.</p>

<p>Expect to feel some soreness after your first few sessions. This is normal and diminishes as your body adapts. Most beginners train two to three times per week, with at least one rest day between sessions.</p>

<h2>Months Two Through Six</h2>

<p>This is the period where beginners see the most dramatic changes. Strength increases rapidly, body composition shifts even without dietary overhaul, and confidence in the gym grows measurably. Research consistently shows that untrained individuals can increase their strength by 20 to 40 percent on major lifts within the first six months of consistent training.</p>

<h2>What You Need to Start</h2>

<p>The barrier to entry is lower than most people assume. You do not need special shoes, gloves, or supplements. Flat-soled shoes or barefoot-style training shoes work well. Comfortable athletic clothing is sufficient. The equipment you need, including barbells, squat racks, and plates, is provided by the gym.</p>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>Finding the Right Environment in Santa Cruz</h2>

<p>Santa Cruz has several gym options, and the right one depends on your goals. For strength training specifically, look for a facility with squat racks, barbells, bumper and iron plates, and available coaching. A gym designed for strength work will have this equipment as its foundation rather than an afterthought.</p>

<p>At Santa Cruz Strength, the facility at 151 Harvey West Blvd is built specifically for barbell and strength training. Staff can help you get oriented during a <a href="/contact">free facility tour</a>, and <a href="/personal-training">personal training</a> is available for people who want structured coaching from the start.</p>

<h2>Frequently Asked Questions</h2>

<h3>Do I need to be in shape before I start lifting?</h3>
<p>No. Strength training is how you get in shape. The program is scaled to your current ability, and the movements are taught progressively.</p>

<h3>How many days per week should a beginner train?</h3>
<p>Two to three days per week is effective for most beginners. Consistency over weeks and months matters more than daily frequency.</p>

<h3>Will strength training make me bulky?</h3>
<p>Significant muscle mass takes years of dedicated training and intentional caloric surplus to build. Initial changes are typically improved tone, posture, and functional strength.</p>

<h3>Is strength training safe for older adults?</h3>
<p>Research supports strength training for adults of all ages. Proper technique and appropriate load selection are important, and a coach can help with both.</p>

<h3>What should I eat when starting strength training?</h3>
<p>Adequate protein intake supports recovery and muscle development. A general guideline is 0.7 to 1.0 grams of protein per pound of body weight daily. Beyond that, eat enough to support your activity level.</p>

<p>Ready to start? <a href="/contact">Book a free facility tour</a> at Santa Cruz Strength to see the space and talk to staff about getting started.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 2. First Visit to a Powerlifting Gym
    # ──────────────────────────────────────────────────
    {
        'title': 'First Visit to a Powerlifting Gym',
        'slug': 'first-visit-powerlifting-gym',
        'excerpt': 'Walking into a strength-focused gym for the first time can feel unfamiliar. Here is what actually happens, what to look for, and how to decide if it fits.',
        'category': 'Getting Started',
        'tags': ['first visit', 'powerlifting', 'gym tour', 'beginners'],
        'seo_title': 'First Visit to a Powerlifting Gym | Santa Cruz Strength',
        'seo_description': 'What to expect on your first visit to a powerlifting or strength-focused gym. What to bring, what to look for, and how to evaluate if the environment fits your goals.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>A powerlifting gym looks and feels different from a commercial fitness center. The equipment is heavier, the layout is more open, and the atmosphere tends to be quieter and more focused. If you are visiting one for the first time, here is what to expect and what to pay attention to.</p>

<h2>What Makes a Powerlifting Gym Different</h2>

<p>Powerlifting gyms are built around the three competition lifts: the squat, bench press, and deadlift. The equipment reflects this focus. You will see power racks or squat stands, competition-style benches, deadlift platforms, and a range of barbell and plate options including both iron and bumper plates.</p>

<p>What you typically will not see: rows of cardio machines, circuit training stations, or a smoothie bar. The space is designed for people who are there to train with barbells.</p>

<h2>What to Bring</h2>

<p>Keep it simple for your first visit:</p>

<ul>
<li><strong>Footwear</strong>: Flat-soled shoes work well. Avoid thick, cushioned running shoes as they compress under heavy loads and reduce stability.</li>
<li><strong>Clothing</strong>: Comfortable athletic wear that allows a full range of motion. Nothing special required.</li>
<li><strong>Water bottle</strong>: Most gyms have water fountains but bringing your own is practical.</li>
<li><strong>Towel</strong>: Optional, but useful.</li>
</ul>

<p>You do not need lifting belts, wraps, or specialty gear for a first visit. That equipment becomes relevant later if you decide to pursue specific training goals.</p>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>What to Look for During a Tour</h2>

<p>When you visit a strength-focused gym, pay attention to several things:</p>

<p><strong>Equipment condition and quantity.</strong> Are the barbells straight and in good condition? Are there enough racks and platforms to train during busy hours without extended waits? Is there a range of plate weights available?</p>

<p><strong>Floor space and layout.</strong> A well-designed strength gym has open floor space around the racks and platforms. Crowded layouts limit what you can do and increase safety concerns during heavy lifting.</p>

<p><strong>Culture and behavior.</strong> Watch how people behave in the space. Do members re-rack their weights? Is the environment focused or chaotic? The culture of a gym determines your daily experience more than the equipment list.</p>

<p><strong>Staff availability.</strong> Can you talk to someone about programming, technique, or how the gym operates? Staff presence during training hours is a practical indicator of how the gym supports its members.</p>

<h2>The Tour Itself</h2>

<p>Most strength-focused gyms offer a walkthrough before you commit to a membership. During this tour, you will see the training floor, learn about access and membership options, and have the opportunity to ask questions.</p>

<p>Good questions to ask during a first visit:</p>

<ul>
<li>What are the busiest training hours?</li>
<li>How many squat racks and platforms are available?</li>
<li>Is coaching or programming support available?</li>
<li>What is the cancellation policy?</li>
<li>Can I try a session before committing?</li>
</ul>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>After the Visit</h2>

<p>Take your time deciding. A good gym will not pressure you into signing up on the spot. The right environment for your training is worth evaluating carefully, because you will spend significant time there over months and years.</p>

<h2>Frequently Asked Questions</h2>

<h3>Do I need powerlifting experience to join a powerlifting gym?</h3>
<p>No. Many members at strength-focused gyms are recreational lifters, general fitness trainees, and athletes from other sports. The equipment is useful for anyone doing barbell training.</p>

<h3>Will I be judged for lifting light weights?</h3>
<p>In a well-run strength gym, no. Everyone started somewhere, and most experienced lifters are respectful of people at every level.</p>

<h3>What if I do not know how to use the equipment?</h3>
<p>Staff can show you the basics during a tour or orientation. If you want more structured help, <a href="/personal-training">personal training</a> provides hands-on coaching.</p>

<h3>How do I know if a gym is right for me?</h3>
<p>Visit during the hours you plan to train. See if the equipment, culture, and logistics match what you need. A <a href="/contact">free facility tour</a> is the most reliable way to evaluate this.</p>

<p>Santa Cruz Strength is located at 151 Harvey West Blvd, Suite D in Santa Cruz. <a href="/contact">Book a free tour</a> to walk through the space and see if it matches what you are looking for.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 3. How 24/7 Gym Access Works
    # ──────────────────────────────────────────────────
    {
        'title': 'How 24/7 Gym Access Works in Santa Cruz',
        'slug': 'how-24-7-gym-access-works-santa-cruz',
        'excerpt': 'Many gyms in Santa Cruz offer around-the-clock access. Here is how keycard and app-based entry systems work, what to consider, and how staffed hours differ from access hours.',
        'category': 'Gym Culture',
        'tags': ['24/7 access', 'gym access', 'Santa Cruz', 'membership'],
        'seo_title': 'How 24/7 Gym Access Works in Santa Cruz | Santa Cruz Strength',
        'seo_description': 'How 24/7 gym access works: keycard entry, staffed vs unstaffed hours, safety considerations, and what to evaluate when choosing a gym with around-the-clock access.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>Around-the-clock gym access is increasingly common, and for people with non-standard schedules, it can be the deciding factor in choosing a facility. Here is how these systems typically work and what to consider when evaluating them.</p>

<h2>How Keycard and App-Based Access Works</h2>

<p>Most 24/7 gyms use either a physical keycard, a key fob, or a mobile app to grant entry outside of staffed hours. When you sign up for a membership that includes 24/7 access, you receive credentials that unlock the facility entrance. The system logs your entry and exit, creating a record of who is in the building at any given time.</p>

<p>The technology varies by facility. Some use magnetic stripe cards, others use RFID fobs, and newer systems rely on smartphone apps with Bluetooth or QR code entry. The underlying principle is the same: verified members can enter the facility when staff are not present.</p>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>Staffed Hours vs. Access Hours</h2>

<p>This distinction is important and frequently misunderstood. Access hours are when you can physically enter the building. Staffed hours are when trained staff members are present to assist with questions, equipment orientation, emergencies, or general support.</p>

<p>During unstaffed hours, you have access to the facility and equipment, but you are training independently. This means no one is available to spot you, answer questions about equipment, or respond to an issue in person. For experienced lifters, this is often preferred. For newer members, staffed hours may be more practical initially.</p>

<h2>Safety Considerations</h2>

<p>Training alone in a gym carries considerations that are worth thinking through:</p>

<ul>
<li><strong>Equipment selection</strong>: During solo sessions, use equipment with built-in safety features. Power racks with adjustable safety pins allow you to squat and bench press without a spotter.</li>
<li><strong>Load management</strong>: Unstaffed hours are not the time to attempt personal records on lifts where failure could be dangerous.</li>
<li><strong>Emergency access</strong>: Confirm that the facility has a clear emergency procedure for unstaffed hours, including phone access and clearly marked exits.</li>
<li><strong>Camera coverage</strong>: Many 24/7 facilities have security cameras as both a deterrent and a safety measure.</li>
</ul>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>Who Benefits Most from 24/7 Access</h2>

<p>Around-the-clock access is particularly valuable for people with variable or non-standard schedules: healthcare workers, restaurant staff, early-morning athletes, parents who train during nap time, or anyone whose schedule does not align with typical business hours.</p>

<p>If you consistently train during conventional hours and prefer having staff available, a membership with staffed-hours-only access may be sufficient and more cost-effective.</p>

<h2>Evaluating 24/7 Gyms in Santa Cruz</h2>

<p>When comparing facilities, ask about the specific access system used, the ratio of staffed to unstaffed hours, security measures, and whether 24/7 access is included in all membership tiers or only premium plans.</p>

<p>Visit during both staffed and unstaffed hours if possible. The experience can differ significantly, and your impression should reflect the conditions you will actually train under.</p>

<h2>Frequently Asked Questions</h2>

<h3>Is 24/7 access safe?</h3>
<p>Modern access control systems, security cameras, and emergency procedures make 24/7 facilities generally safe. Using equipment with built-in safety features and managing your load appropriately are practical personal precautions.</p>

<h3>Can I bring a guest during unstaffed hours?</h3>
<p>Policies vary by facility. Most 24/7 gyms restrict guest access to staffed hours. Check the membership terms for specifics.</p>

<h3>What happens if the access system malfunctions?</h3>
<p>Reputable facilities have a support line or app-based troubleshooting for access issues. Ask about this during your tour.</p>

<p>Want to see how access works at Santa Cruz Strength? <a href="/contact">Book a free facility tour</a> at 151 Harvey West Blvd to walk through the space, learn about membership options, and see the access system firsthand. <a href="/join">Compare membership plans</a> to find the right fit.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 4. How Many Days a Week Should a Beginner Lift?
    # ──────────────────────────────────────────────────
    {
        'title': 'How Many Days a Week Should a Beginner Lift?',
        'slug': 'how-many-days-a-week-should-a-beginner-lift',
        'excerpt': 'The answer depends on your goals and recovery, but research points to a clear range. Here is what the evidence says and how to apply it.',
        'category': 'Strength Science',
        'tags': ['training frequency', 'beginners', 'programming', 'FAQ'],
        'seo_title': 'How Many Days a Week Should a Beginner Lift? | Santa Cruz Strength',
        'seo_description': 'How many days per week should a beginner lift weights? The evidence-based answer, programming considerations, and how to build consistency.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>Training frequency is one of the most common questions from people starting a strength program. The short answer supported by exercise science: two to three days per week is effective for most beginners. Here is the reasoning and how to apply it practically.</p>

<h2>What the Research Shows</h2>

<p>Studies on resistance training frequency consistently demonstrate that training a muscle group two to three times per week produces optimal strength and hypertrophy gains for beginners. A 2016 meta-analysis published in Sports Medicine found that training each muscle group twice per week produced superior results compared to once per week, while three times per week showed similar benefits to twice per week for most populations.</p>

<p>The mechanism is straightforward: muscle protein synthesis, the process by which your body repairs and builds muscle tissue after training, remains elevated for approximately 24 to 48 hours after a session in trained individuals. Spacing sessions throughout the week allows you to stimulate this process multiple times rather than once.</p>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>Three Days Per Week: The Standard Starting Point</h2>

<p>A three-day program is the most common recommendation for beginners because it balances training stimulus with recovery. A typical structure looks like this:</p>

<ul>
<li><strong>Day 1 (Monday)</strong>: Squat, bench press, barbell row</li>
<li><strong>Day 2 (Wednesday)</strong>: Deadlift, overhead press, pull-ups or lat pulldown</li>
<li><strong>Day 3 (Friday)</strong>: Squat variation, bench variation, accessory work</li>
</ul>

<p>Each session takes 45 to 75 minutes including warm-up. The rest days between sessions are essential for recovery and adaptation.</p>

<h2>When Two Days Is Enough</h2>

<p>Two full-body sessions per week is sufficient to produce measurable strength gains, improve body composition, and maintain health benefits. This frequency works well for people with demanding schedules, athletes whose primary sport requires significant recovery, or anyone who wants to maintain a base level of strength without high time commitment.</p>

<p>Two days per week is considerably better than zero, and sustainability matters more than optimization in the first year of training.</p>

<h2>When to Consider Four or Five Days</h2>

<p>After six to twelve months of consistent training, some lifters benefit from increased frequency. This is typically when training volume needs to be distributed across more sessions to manage fatigue and allow for specialized work on weaker areas.</p>

<p>For beginners, increasing to four or five days before building a solid foundation on three days often leads to overreaching and burnout rather than faster progress.</p>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>The Most Important Variable</h2>

<p>Consistency over months is more important than weekly frequency. A person who trains two days per week for 52 weeks will see dramatically better results than someone who trains six days per week for three weeks before stopping.</p>

<p>Choose the frequency you can sustain. Build the habit first. Optimize later.</p>

<h2>Frequently Asked Questions</h2>

<h3>Can I train every day as a beginner?</h3>
<p>Daily training is not recommended for beginners performing full-body strength work. Muscles need recovery time between sessions. Training the same muscles before they have recovered can lead to diminished performance and increased injury risk.</p>

<h3>Should I do cardio on rest days?</h3>
<p>Light activity like walking, cycling, or swimming on rest days is fine and can support recovery. Avoid high-intensity conditioning that competes with your strength training recovery.</p>

<h3>What if I miss a session?</h3>
<p>One missed session in a week has negligible impact on long-term progress. Resume your schedule the following week. Do not try to "make up" sessions by doubling up.</p>

<h3>How long before I see results?</h3>
<p>Most beginners notice improved energy, better sleep, and increased confidence within two to three weeks. Visible changes in body composition typically become apparent after six to eight weeks of consistent training.</p>

<p>If you want help building a training schedule that fits your life, <a href="/personal-training">talk to a coach</a> at Santa Cruz Strength. Or <a href="/contact">book a free tour</a> to see the facility and learn about membership options.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 5. How to Choose a Strength Gym in Santa Cruz
    # ──────────────────────────────────────────────────
    {
        'title': 'How to Choose a Strength Gym in Santa Cruz',
        'slug': 'how-to-choose-a-strength-gym-santa-cruz',
        'excerpt': 'Santa Cruz has many fitness options. Choosing the right strength gym depends on equipment, culture, location, and how well the environment matches your training goals.',
        'category': 'Gym Culture',
        'tags': ['choosing a gym', 'Santa Cruz', 'gym comparison', 'strength gym'],
        'seo_title': 'How to Choose a Strength Gym in Santa Cruz | Santa Cruz Strength',
        'seo_description': 'A practical guide to choosing a strength gym in Santa Cruz. What to look for in equipment, culture, coaching, and membership before committing.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>Choosing a gym is a decision that affects your daily routine, your training progress, and your likelihood of sticking with a program over time. In Santa Cruz, the options range from large commercial fitness centers to specialized strength facilities. Here is how to evaluate them based on what actually matters for strength training.</p>

<h2>Start with Your Training Goals</h2>

<p>Before comparing gyms, be honest about what you need. If your primary goal is barbell strength training, you need squat racks, deadlift platforms, and heavy dumbbells. If you want group fitness classes, you need a facility with a class schedule. If you want general health and fitness, most gyms will work, but you will stay longer at one that feels right.</p>

<p>The most common mistake is choosing a gym based on price alone without considering whether the equipment and environment actually support your goals.</p>

<h2>Equipment to Look For</h2>

<p>For strength training, the essential equipment includes:</p>

<ul>
<li><strong>Power racks with adjustable safety pins</strong>: These are essential for safe squatting and bench pressing, especially when training alone.</li>
<li><strong>Olympic barbells</strong>: Standard 20kg/45lb bars that can handle heavy loads without bending.</li>
<li><strong>Plate variety</strong>: Both iron and bumper plates in sufficient quantity so you are not waiting during busy hours.</li>
<li><strong>Deadlift platforms or designated areas</strong>: Space where you can lower a barbell from hip height without damaging the floor or being told to be quieter.</li>
<li><strong>Specialty bars</strong>: Safety squat bars, trap/hex bars, and cambered bars add training variety and accommodate physical limitations.</li>
</ul>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>Visit During Your Training Hours</h2>

<p>Websites show a gym at its best. The reality during peak hours can be different. Visit the gym during the time you plan to train and observe: How many people are waiting for squat racks? Is the equipment you need available? Is the space clean and organized?</p>

<p>A gym with excellent equipment that is inaccessible during your preferred hours is not the right gym for you.</p>

<h2>Culture and Community</h2>

<p>The daily experience of training at a gym is shaped by the people in it. Pay attention to how members behave: do they re-rack weights, wipe down equipment, and share space respectfully? Is the atmosphere focused or distracting?</p>

<p>Some people prefer a quiet, heads-down training environment. Others want a social, team-oriented atmosphere. Neither is wrong, but knowing your preference helps you choose a gym where you will actually want to train.</p>

<h2>Coaching and Support</h2>

<p>For beginners and intermediate lifters, access to coaching can accelerate progress and reduce injury risk. Ask whether the gym offers personal training, whether staff are available during training hours, and whether coaching is included in membership or costs extra.</p>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>Location and Logistics</h2>

<p>Research on gym adherence consistently shows that proximity to home or work is one of the strongest predictors of long-term attendance. A gym that requires a 30-minute drive will be used less than one that is on your commute, regardless of how good the equipment is.</p>

<p>Also consider parking, shower facilities, and operating hours in your evaluation.</p>

<h2>Frequently Asked Questions</h2>

<h3>Should I choose the cheapest gym?</h3>
<p>The cheapest option is not always the best value. If you stop going after a month because the equipment does not match your needs, the money is wasted regardless of the monthly rate. Choose the gym where you will actually train consistently.</p>

<h3>How important is a gym's brand or reputation?</h3>
<p>Reputation provides useful signal but is not a substitute for visiting in person. What matters is whether the specific location, at the specific hours you train, has the equipment and culture that fit your goals.</p>

<h3>Can I try a gym before committing?</h3>
<p>Most reputable gyms offer a tour or trial session. Take advantage of this. It is the most reliable way to evaluate a facility.</p>

<p>Santa Cruz Strength is located at 151 Harvey West Blvd in the Harvey West Business Park. The facility is built specifically for strength training. <a href="/contact">Book a free tour</a> to walk through the space and see if it fits what you need. <a href="/join">Compare membership options</a> online.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 6. Personal Trainer vs Open Gym
    # ──────────────────────────────────────────────────
    {
        'title': 'Personal Trainer vs Open Gym: Which Is Right for You?',
        'slug': 'personal-trainer-vs-open-gym-santa-cruz',
        'excerpt': 'Personal training and open gym access serve different needs. Here is how to decide which model fits your experience level, goals, and budget.',
        'category': 'Training Tips',
        'tags': ['personal training', 'open gym', 'coaching', 'programming'],
        'seo_title': 'Personal Trainer vs Open Gym in Santa Cruz | Santa Cruz Strength',
        'seo_description': 'Should you hire a personal trainer or train independently? A comparison of cost, structure, accountability, and results for different experience levels.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>The choice between personal training and open gym access is one of the first decisions people face when starting or returning to strength training. Both models work. The right choice depends on where you are now, where you want to go, and what kind of support helps you get there.</p>

<h2>What Personal Training Provides</h2>

<p>A personal trainer writes your program, coaches your technique in real time, and adjusts the plan based on your progress and feedback. The value breaks down into several categories:</p>

<ul>
<li><strong>Technique coaching</strong>: A trained eye on your movement patterns identifies issues that you cannot see or feel yourself. For compound barbell movements like the squat and deadlift, small technique corrections can make significant differences in safety and effectiveness.</li>
<li><strong>Programming</strong>: A coach designs a program tailored to your goals, schedule, and recovery capacity. This eliminates the guesswork of choosing exercises, sets, reps, and progression.</li>
<li><strong>Accountability</strong>: A scheduled appointment with another person is harder to skip than a vague intention to go to the gym.</li>
<li><strong>Efficiency</strong>: Sessions are structured to maximize the training effect in the available time. No wandering between machines or spending 20 minutes deciding what to do next.</li>
</ul>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>What Open Gym Provides</h2>

<p>Open gym access means you have the facility and equipment available to train on your own schedule, with your own program. The advantages include:</p>

<ul>
<li><strong>Flexibility</strong>: Train when you want, for as long as you want, without scheduling around another person.</li>
<li><strong>Cost</strong>: Open gym memberships are typically less expensive than personal training packages.</li>
<li><strong>Autonomy</strong>: You control the programming, pace, and focus of every session.</li>
<li><strong>Self-reliance</strong>: Over time, you develop the knowledge and confidence to manage your own training.</li>
</ul>

<h2>When to Choose Personal Training</h2>

<p>Personal training is most valuable when you are learning the foundational movements for the first time, when you are returning from an injury, when you have hit a plateau and need programming expertise, or when accountability is the primary factor keeping you consistent.</p>

<p>For beginners, even a short block of personal training (eight to twelve sessions) can provide the foundational technique and program knowledge needed to train independently afterward.</p>

<h2>When Open Gym Is Sufficient</h2>

<p>If you have solid technique on the major lifts, a program you trust (whether self-written or from a reputable source), and the discipline to train consistently without external accountability, open gym access provides everything you need at a lower cost.</p>

<p>Many experienced lifters at Santa Cruz Strength train independently with open gym memberships, occasionally booking coaching sessions for specific technique work or program design.</p>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>A Practical Middle Ground</h2>

<p>The choice is not binary. A common approach is to start with personal training to build a foundation, then transition to open gym training with periodic coaching check-ins. This combines the benefits of both models while managing cost over time.</p>

<h2>Frequently Asked Questions</h2>

<h3>How much does personal training cost compared to open gym?</h3>
<p>Pricing varies by facility and coach. Personal training is typically priced per session or in packages, and costs more than a monthly gym membership. The investment is in expertise and personalized attention. Contact the gym directly for current rates.</p>

<h3>Can I do personal training and open gym together?</h3>
<p>Yes. Many members combine a weekly coaching session with additional independent training days. This is an effective and cost-efficient approach.</p>

<h3>How do I know if my trainer is qualified?</h3>
<p>Look for trainers with recognized certifications and practical experience coaching the movements you want to learn. Ask about their training philosophy and experience with clients at your level.</p>

<p>Interested in coaching? <a href="/personal-training">Learn about personal training</a> at Santa Cruz Strength. Prefer to train independently? <a href="/contact">Book a free facility tour</a> to see the open gym space and equipment.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 7. Powerlifting vs Olympic Weightlifting vs Strongman
    # ──────────────────────────────────────────────────
    {
        'title': 'Powerlifting vs Olympic Weightlifting vs Strongman: A Practical Comparison',
        'slug': 'powerlifting-vs-olympic-weightlifting-vs-strongman',
        'excerpt': 'Three strength sports, three different sets of movements and goals. Here is what distinguishes each and how to decide which path fits your interests.',
        'category': 'Strength Science',
        'tags': ['powerlifting', 'Olympic weightlifting', 'strongman', 'strength sports'],
        'seo_title': 'Powerlifting vs Olympic Weightlifting vs Strongman | Santa Cruz Strength',
        'seo_description': 'A practical comparison of powerlifting, Olympic weightlifting, and strongman. Movements, training demands, equipment, and how to choose.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>Powerlifting, Olympic weightlifting, and strongman are three distinct strength sports that share a common foundation but differ significantly in their movements, competition formats, and training demands. If you are interested in strength training and wondering which direction to explore, here is a practical overview of each.</p>

<h2>Powerlifting</h2>

<p>Powerlifting tests maximal strength in three lifts: the squat, bench press, and deadlift. In competition, each lifter gets three attempts at each lift, and the goal is to lift the heaviest weight possible for a single repetition. The total of your best successful attempt in each lift determines your ranking.</p>

<p><strong>Training characteristics</strong>: Powerlifting training emphasizes heavy loads, low repetitions, and progressive overload on the three competition lifts. Accessory work targets weak points in the lifts. Training cycles typically peak for a competition and then reset.</p>

<p><strong>Equipment needed</strong>: A power rack, flat bench, barbell, and plates are the essentials. Specialty equipment like competition benches, deadlift bars, and calibrated plates becomes relevant at intermediate and advanced levels.</p>

<p><strong>Who it suits</strong>: People who enjoy testing maximal strength, prefer a structured and measurable training approach, and are drawn to slow, grinding efforts under heavy loads.</p>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>Olympic Weightlifting</h2>

<p>Olympic weightlifting (often called "Oly lifting") tests two lifts: the snatch and the clean and jerk. Both lifts involve moving a barbell from the floor to overhead in one or two explosive movements. They are the only weightlifting events in the Olympic Games.</p>

<p><strong>Training characteristics</strong>: Olympic lifting demands explosive power, speed, flexibility, and precise timing. Training includes the competition lifts and their variations (power cleans, hang snatches, front squats), along with significant mobility work. The technical learning curve is steeper than powerlifting.</p>

<p><strong>Equipment needed</strong>: Olympic barbells (which spin more freely than power bars), bumper plates, and a lifting platform are essential. Weightlifting shoes with a raised heel are standard.</p>

<p><strong>Who it suits</strong>: Athletes who enjoy explosive, dynamic movement, have good mobility or are willing to develop it, and are drawn to the technical challenge of the lifts.</p>

<h2>Strongman</h2>

<p>Strongman competitions test strength across a wide variety of events that change from competition to competition. Common events include atlas stones, log press, farmer's walks, yoke carries, tire flips, and deadlift variations. The sport emphasizes functional strength and the ability to move heavy, awkward objects.</p>

<p><strong>Training characteristics</strong>: Strongman training combines barbell work (similar to powerlifting) with implement training using specialty equipment. Training is typically varied, combining heavy strength work with event-specific practice and conditioning.</p>

<p><strong>Equipment needed</strong>: Beyond standard barbell equipment, strongman training benefits from implements like atlas stones, logs, farmer's walk handles, and yoke frames. Not all gyms have this equipment.</p>

<p><strong>Who it suits</strong>: People who enjoy variety in their training, want to build strength that transfers to real-world tasks, and are drawn to the challenge of moving heavy, unconventional objects.</p>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>Overlap and General Strength</h2>

<p>All three sports build from the same foundation: squats, deadlifts, pressing, and pulling. A strong general strength base is valuable regardless of which sport you pursue, and many people train for general strength without competing in any specific sport.</p>

<p>If you are not sure which direction interests you, start with general barbell training. Build strength on the fundamental movements, and explore the sports as your interests develop.</p>

<h2>Frequently Asked Questions</h2>

<h3>Which sport is best for building muscle?</h3>
<p>All three build significant muscle. Powerlifting and strongman tend to produce more overall mass due to higher training volumes and the emphasis on maximal loads. Olympic lifting develops powerful, athletic physiques with particular emphasis on the legs, back, and shoulders.</p>

<h3>Can I train for more than one sport at a time?</h3>
<p>At a recreational level, yes. Many lifters incorporate elements from multiple sports in their training. At a competitive level, specialization becomes more important.</p>

<h3>Which sport is safest for beginners?</h3>
<p>All three can be practiced safely with proper instruction. Powerlifting movements have the lowest technical complexity, making them accessible for beginners to learn with minimal coaching. Olympic lifting requires more instruction due to the speed and technical demands of the snatch and clean and jerk.</p>

<p>Santa Cruz Strength is equipped for barbell training across all three disciplines. <a href="/contact">Book a free facility tour</a> to see the equipment and talk to staff about your training goals. <a href="/personal-training">Personal training</a> is available for technique coaching in any of these lifts.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 8. Strength Training After 40
    # ──────────────────────────────────────────────────
    {
        'title': 'Strength Training After 40 in Santa Cruz',
        'slug': 'strength-training-after-40-santa-cruz',
        'excerpt': 'Aging changes some aspects of training, but the benefits of strength work become more important with each decade. Here is what to adjust and what stays the same.',
        'category': 'Getting Started',
        'tags': ['over 40', 'aging', 'strength training', 'longevity', 'Santa Cruz'],
        'seo_title': 'Strength Training After 40 in Santa Cruz | Santa Cruz Strength',
        'seo_description': 'How strength training changes after 40: what to adjust, what stays the same, and why the benefits become more important as you age.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>Starting or continuing strength training after 40 is one of the most impactful decisions you can make for long-term health. The physiological benefits, including improved bone density, metabolic health, functional independence, and injury resilience, become more important with each passing decade. Here is what changes, what does not, and how to train effectively.</p>

<h2>What Changes After 40</h2>

<p>Several physiological changes occur with aging that affect training:</p>

<ul>
<li><strong>Recovery takes longer</strong>: The same training session that required 48 hours of recovery at 25 may require 72 hours at 50. This is normal and manageable through programming adjustments.</li>
<li><strong>Joint tolerance shifts</strong>: Some movements that were comfortable at 30 may produce joint discomfort at 45. This does not mean you stop training. It means you select exercise variations that load the target muscles while respecting joint limitations.</li>
<li><strong>Warm-ups matter more</strong>: Cold muscles and connective tissues are less pliable in older adults. A thorough warm-up of 10 to 15 minutes before heavy work reduces injury risk and improves performance.</li>
<li><strong>Muscle mass declines without intervention</strong>: After age 30, the body loses approximately 3 to 8 percent of muscle mass per decade without resistance training. Strength training is the primary intervention that reverses this trend.</li>
</ul>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>What Does Not Change</h2>

<p>The fundamental biology of muscle adaptation does not have an expiration date. Your muscles still respond to progressive overload. Your bones still get denser under load. Your nervous system still improves its ability to recruit muscle fibers. The mechanism is the same at 55 as it is at 25. The timeline and approach shift, but the underlying physiology still works.</p>

<p>Research published in the Journal of Strength and Conditioning Research has demonstrated that adults in their 60s and 70s can make significant strength gains when following structured resistance training programs.</p>

<h2>Programming Considerations</h2>

<p>Effective training after 40 looks like this:</p>

<ul>
<li><strong>Frequency</strong>: Two to four sessions per week, depending on recovery capacity and other life demands.</li>
<li><strong>Exercise selection</strong>: Compound movements remain the foundation. Substitute variations when needed: trap bar deadlifts instead of conventional if the lower back is sensitive, incline pressing if flat bench causes shoulder discomfort, goblet squats as a squat variation.</li>
<li><strong>Load management</strong>: Training does not need to be maximally heavy to be effective. Moderate loads with controlled technique and appropriate volume produce excellent results while managing joint stress.</li>
<li><strong>Warm-up protocol</strong>: Longer, more deliberate warm-ups including general movement, dynamic stretching, and progressive loading on the working exercises.</li>
</ul>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>Common Mistakes</h2>

<p>The biggest mistake people over 40 make is stopping entirely. Aches and pains are often interpreted as signals to reduce activity, when in most cases, appropriate strength training reduces pain and improves function over time. Disuse is a far greater health risk than intelligent training.</p>

<p>The second most common mistake is training exactly as you did at 25. Effective training at 45 or 55 requires adjusting volume, intensity, and exercise selection to match your current recovery capacity.</p>

<h2>Frequently Asked Questions</h2>

<h3>Is it too late to start strength training at 50 or 60?</h3>
<p>No. Research demonstrates that previously untrained adults can make significant strength and muscle gains at any age. The best time to start was 20 years ago. The second best time is now.</p>

<h3>Will strength training help with joint pain?</h3>
<p>In many cases, yes. Strengthening the muscles around a joint provides support and can reduce pain associated with conditions like osteoarthritis. Consult your physician for specific medical conditions, and work with a qualified coach to select appropriate exercises.</p>

<h3>Do I need a coach?</h3>
<p>A coach is valuable for learning proper technique, selecting appropriate exercise variations, and designing a program that accounts for individual limitations. Even a few sessions can provide a strong foundation.</p>

<p>Santa Cruz Strength trains members across a wide range of ages and experience levels. <a href="/contact">Book a free facility tour</a> to see the space and discuss your goals. <a href="/personal-training">Personal training</a> is available for individualized coaching.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 9. Strength Training for Surfers
    # ──────────────────────────────────────────────────
    {
        'title': 'Strength Training for Surfers in Santa Cruz',
        'slug': 'strength-training-for-surfers-santa-cruz',
        'excerpt': 'Surfing demands explosive power, rotational strength, and injury resilience. Here is why time in the weight room directly improves your time in the water.',
        'category': 'Outdoor Athletes',
        'tags': ['surfing', 'strength training', 'Santa Cruz', 'outdoor athletes'],
        'seo_title': 'Strength Training for Surfers in Santa Cruz | Santa Cruz Strength',
        'seo_description': 'How strength training improves surfing performance. The specific lifts that carry over, programming for surfers, and building injury resilience.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>Santa Cruz is a surfing town. The breaks at Pleasure Point, Steamer Lane, and across the coastline draw surfers who train in the water year-round. What many surfers underestimate is how much their performance in the water is limited by their strength on land.</p>

<h2>Why Surfers Need Strength Training</h2>

<p>Surfing is a physically demanding sport that requires explosive hip extension for pop-ups, rotational power for turns, sustained upper body endurance for paddling, and core stability to hold position on unpredictable wave faces.</p>

<p>Most surf-related injuries, including rotator cuff issues, lower back pain, and knee problems, are rooted in muscular imbalances that develop from the repetitive, asymmetric nature of surfing. Strength training directly addresses these imbalances by building balanced strength across opposing muscle groups.</p>

<h2>The Lifts That Carry Over</h2>

<ul>
<li><strong>Deadlifts</strong>: Build posterior chain strength (hamstrings, glutes, lower back) that powers your pop-up and keeps your spine stable in critical positions.</li>
<li><strong>Romanian deadlifts</strong>: Train the hip hinge pattern under load, directly improving your ability to generate force from the hips during turns.</li>
<li><strong>Barbell rows</strong>: Strengthen the back muscles responsible for paddling. Stronger pulling muscles mean more efficient paddling and more waves caught.</li>
<li><strong>Front squats</strong>: Develop quad strength and thoracic mobility, both essential for maintaining a low, powerful stance on the board.</li>
<li><strong>Turkish get-ups</strong>: Build total-body stability and shoulder integrity that protects against the rotational demands of surfing.</li>
<li><strong>Single-leg work</strong>: Bulgarian split squats and lunges develop the unilateral stability needed for balance on the board.</li>
</ul>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>Programming for Surfers</h2>

<p>Two to three strength sessions per week is sufficient for most surfers to see meaningful results without interfering with water time. The key principles:</p>

<ul>
<li><strong>Schedule around surf</strong>: Lift on days when you are not surfing, or at least separate sessions by several hours. Do not lift heavy before a surf session.</li>
<li><strong>Prioritize posterior chain and pulling</strong>: Surfing naturally develops some pushing and core strength. The weight room should emphasize the pulling and posterior chain work that surfing does not adequately develop.</li>
<li><strong>Progressive overload</strong>: Add small amounts of weight over time. Consistent progression over months produces far better results than occasional intense sessions.</li>
<li><strong>Mobility work</strong>: Include hip and thoracic spine mobility in your warm-up to maintain the range of motion surfing demands.</li>
</ul>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>Injury Prevention</h2>

<p>Surfers who commit to consistent strength training report fewer injuries and faster recovery when injuries do occur. The mechanism is straightforward: stronger muscles, tendons, and connective tissues are more resilient under the physical stresses of surfing.</p>

<p>Shoulder impingement, one of the most common surf injuries, is directly addressed by strengthening the rotator cuff and upper back muscles through rows, face pulls, and external rotation exercises.</p>

<h2>Frequently Asked Questions</h2>

<h3>Will lifting weights make me too heavy to surf?</h3>
<p>No. The amount of muscle mass gained from two to three strength sessions per week is modest and functional. Most surfers who add strength training report feeling more powerful and agile in the water, not heavier.</p>

<h3>How long before I notice a difference in my surfing?</h3>
<p>Most surfers report noticeable improvements in paddle endurance and pop-up speed within six to eight weeks of consistent training. Injury resilience benefits accumulate over months.</p>

<h3>Can I train at the gym and still surf every day?</h3>
<p>Yes, with appropriate programming. Keep gym sessions moderate on days adjacent to surf sessions. A coach can help structure a schedule that supports both.</p>

<p>Santa Cruz Strength works with surfers, climbers, trail runners, and other outdoor athletes. <a href="/contact">Book a free facility tour</a> to see the space. <a href="/personal-training">Personal training</a> is available for sport-specific programming.</p>""",
    },

    # ──────────────────────────────────────────────────
    # 10. Gym Near UCSC
    # ──────────────────────────────────────────────────
    {
        'title': 'Gym Near UCSC: An Off-Campus Decision Guide',
        'slug': 'ucsc-off-campus-gym-guide',
        'excerpt': 'UCSC students looking for an off-campus gym have several options. Here is how to evaluate them based on what actually matters for your training and budget.',
        'category': 'Gym Culture',
        'tags': ['UCSC', 'college gym', 'Santa Cruz', 'students', 'off-campus'],
        'seo_title': 'Gym Near UCSC: Off-Campus Decision Guide | Santa Cruz Strength',
        'seo_description': 'A practical guide for UCSC students looking for an off-campus gym in Santa Cruz. What to consider, how to evaluate options, and what to prioritize on a student budget.',
        'content': lambda slug: f"""{_ph('hero', slug, 'Hero image coming soon')}

<p>The University of California, Santa Cruz offers on-campus recreation facilities, but many students find that an off-campus gym better fits their training goals, schedule, or preferred environment. If you are a UCSC student considering off-campus options, here is a practical guide to making that decision.</p>

<h2>On-Campus vs. Off-Campus: The Trade-Offs</h2>

<p>On-campus recreation centers are convenient and often included in student fees. The main limitations tend to be equipment selection (particularly for barbell training), crowding during peak hours, and reduced hours during academic breaks.</p>

<p>Off-campus gyms offer more specialized equipment, different atmospheres, and hours that may better fit your schedule. The trade-off is cost, since you will be paying a separate membership, and commute time.</p>

{_ph('supporting', slug, 'Supporting visual coming soon')}

<h2>What to Prioritize as a Student</h2>

<p><strong>Budget</strong>: Student budgets are real constraints. Compare monthly costs across facilities and look for student discounts where available. Consider the per-visit cost: a gym you visit 15 times per month is better value than one you visit 4 times regardless of monthly price.</p>

<p><strong>Location and commute</strong>: A gym close to campus or on your regular commute route will get more use than one that requires a special trip. Factor in parking and travel time.</p>

<p><strong>Equipment for your goals</strong>: If you are interested in barbell strength training, you need squat racks, platforms, and adequate plate inventory. If you primarily want cardio and machines, most commercial gyms will work.</p>

<p><strong>Hours</strong>: Student schedules are variable. A gym with extended or 24/7 hours accommodates late-night study schedules and early morning classes.</p>

<p><strong>Culture</strong>: The social environment matters. Some students want a community-oriented gym. Others want a quiet space to focus. Visit during the hours you plan to train to get an accurate impression.</p>

<h2>Types of Gyms Available in Santa Cruz</h2>

<p><strong>Large commercial gyms</strong>: Broad equipment selection, group classes, pools, and cardio machines. Generally the most affordable monthly rates. Can be crowded during peak hours.</p>

<p><strong>Strength-focused gyms</strong>: Specialized equipment for barbell training. Smaller membership bases mean less crowding. The atmosphere tends to be more focused. Monthly rates are typically higher than commercial gyms but the per-visit value can be better for serious trainees.</p>

<p><strong>CrossFit affiliates and boutique studios</strong>: Class-based training models with coaching included in the membership. Higher monthly costs, but the structured programming and community are the primary value.</p>

{_ph('infographic', slug, 'Infographic coming soon')}

<h2>Making the Decision</h2>

<p>The best approach is to visit two or three facilities before committing. Most gyms offer a tour or trial session. Use this to evaluate the equipment, atmosphere, and whether the location is practical for your weekly routine.</p>

<p>Ask about:</p>

<ul>
<li>Student discount availability</li>
<li>Month-to-month vs. contract membership options</li>
<li>Freezing or cancellation policies (important for summer and academic breaks)</li>
<li>Peak hours and equipment availability during those times</li>
</ul>

<h2>Frequently Asked Questions</h2>

<h3>Do off-campus gyms in Santa Cruz offer student discounts?</h3>
<p>Some do. Ask directly when touring the facility. Bring your student ID.</p>

<h3>Can I freeze my membership over summer break?</h3>
<p>Policies vary by gym. This is worth asking before signing up, since many UCSC students leave during summer.</p>

<h3>Is the on-campus gym sufficient for strength training?</h3>
<p>It depends on your specific goals and tolerance for crowding. For general fitness, the campus facilities work. For focused barbell training with specific equipment needs, an off-campus strength gym may be a better fit.</p>

<h3>How do I get to off-campus gyms without a car?</h3>
<p>Santa Cruz Metro buses connect campus to most parts of the city. Some gyms are also bikeable from campus or from common off-campus housing areas. Check transit routes when evaluating gym location.</p>

<p>Santa Cruz Strength is located at 151 Harvey West Blvd in the Harvey West Business Park, accessible from campus by bus or car. <a href="/contact">Book a free facility tour</a> to see the equipment and learn about membership options. <a href="/join">Compare plans</a> to find the right fit for your budget and goals.</p>""",
    },
]


def get_articles():
    """Return the 10 articles with rendered content (lambdas evaluated)."""
    result = []
    for a in PUBLISHED_ARTICLES:
        article = dict(a)
        if callable(article['content']):
            article['content'] = article['content'](article['slug'])
        article['author'] = 'Santa Cruz Strength'
        article['published'] = True
        article['review_status'] = None
        article['noindex'] = False
        result.append(article)
    return result


# Blog cover photographs, vendored locally from the vendor CDN so no remote host
# remains in the build. They are genuine photographs of this gym, confirmed by
# the painted wall seal and the green stripe, but every one shows identifiable
# people, so they are held under the same likeness permission blocker as the
# frames in SCS_MEDIA_AWAITING_PERMISSION. The seed publishes no cover until
# permission lands, rather than applying a stricter rule to new photographs than
# to ones that happened to be live already.
#
# All four are also small, between 168x300 and 533x400, which is workable for a
# card and thin for anything larger.
BLOG_COVERS_AWAITING_PERMISSION = {
    'group_class_floor': '/assets/scs/blog/group-class-floor.jpg',
    'group_class_wall_seal': '/assets/scs/blog/group-class-wall-seal.jpg',
    'training_floor_lifting': '/assets/scs/blog/training-floor-lifting.jpg',
    'exterior_signage': '/assets/scs/blog/exterior-signage.jpg',
}
