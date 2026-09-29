---
# ─────────────────────────────────────────────────────────────────────────────
# DAYNA GAN — PORTFOLIO CONTENT (single source of truth)
#
# This one file renders BOTH modes (Professional + Game).
#
#   # Heading    = LEVEL  (a section / a mission biome)
#   ## Heading   = ROOM   (a content item, e.g. one internship or one project)
#   ### Heading  = PART   (sub-content, e.g. one bullet or one project component)
#
# Lines of `key: value` directly under a heading (before the first blank line)
# are metadata. Everything after the blank line is normal Markdown prose.
#
# Common metadata keys
#   id        stable identifier (lowercase, dashes). Used for links + save data.
#   period    dates shown in both modes
#   tags      comma-separated chips
#   grants    skill XP given when the room/part is scanned or built,
#             e.g. `grants: python +1, soldering +1`
#   requires  skill levels needed (project builds), e.g. `requires: soldering 3`
#   needs     other project ids that must be built first
#   link      a project/room this points to (cross-link), e.g. `link: projects/rosa-ros2`
#   status    complete | in-progress | todo
#   biome / light / enemies   (levels only) game world settings
#
# Anything marked TODO is a placeholder for Dayna to fill in.
# ─────────────────────────────────────────────────────────────────────────────
name: Gan Sim Ru Dayna
displayName: Dayna Gan
title: Dayna Gan — Computer Engineering, Robotics & Embedded Systems
description: >-
  Portfolio of Dayna Gan, a Computer Engineering undergraduate working across
  robotics, embedded systems, hardware, simulation and intelligent autonomous
  systems.
tagline: I build where software meets the physical world — robots, sensors, simulations and the firmware that holds them together.
location: Singapore
email: daynagsr@gmail.com
linkedin: https://www.linkedin.com/in/daynagan/
github: https://github.com/DaynaG3
githubUsername: DaynaG3
resume: /resume/DaynaGan_Resume.pdf

# Comms Core (Contact) unlocks after this many missions are cleared.
contactUnlockAfter: 3

# Companion cat (guide). Speech bubbles are signed with this name.
companion: { name: Xiao Hu, meaning: Little Tiger }

# ── SKILL TREE ───────────────────────────────────────────────────────────────
# Levels are earned in-game from `grants:` lines below. `max` caps the level.
# To change a proficiency, edit the grants lines (or `start` for a base level).
skills:
  - { id: python, name: Python, group: Programming, max: 5 }
  - { id: cpp, name: C++, group: Programming, max: 5 }
  - { id: java, name: Java, group: Programming, max: 5 }
  - { id: verilog, name: Verilog, group: Programming, max: 5 }
  - { id: ros2, name: ROS 2, group: Robotics & simulation, max: 5 }
  - { id: isaac-sim, name: NVIDIA Isaac Sim, group: Robotics & simulation, max: 5 }
  - { id: nav2, name: Nav2, group: Robotics & simulation, max: 5 }
  - { id: rl, name: Reinforcement learning, group: Robotics & simulation, max: 5 }
  - { id: cad, name: CAD, group: Hardware & prototyping, max: 5 }
  - { id: inventor, name: Autodesk Inventor, group: Hardware & prototyping, max: 5 }
  - { id: arduino, name: Arduino, group: Hardware & prototyping, max: 5 }
  - { id: esp32, name: ESP32, group: Hardware & prototyping, max: 5 }
  - { id: stm32, name: STM32, group: Hardware & prototyping, max: 5 }
  - { id: soldering, name: Soldering, group: Hardware & prototyping, max: 5 }
  - { id: assembly, name: Hands-on assembly, group: Hardware & prototyping, max: 5 }
  - { id: 3d-printing, name: 3D printing, group: Hardware & prototyping, max: 5 }
  - { id: leadership, name: Leadership, group: People, max: 5 }
---

# Station Hub
id: hub
kind: hub
biome: orbital-station
light: #cbd5e1
accent: #a78bfa

The Workshop — Dayna's home aboard the orbital station. Pick a deployment on the star map.

## Star Map
id: star-map

Choose a mission. Cleared missions show their completion.

## Dayna's Bunk
id: bunk

Welcome aboard. I'm Dayna — grab my résumé from the desk, or head to the star map to explore.

## Collection Locker
id: locker

Every project you've built is stored here. Rotate it, explode it, take it apart.

## Vendor Stall
id: vendor
status: todo

Closed for now — something is coming soon.

# About
id: about
eyebrow: 01 / About
title: Engineer in the making.
kicker: Hardware · Software · Everything between
biome: core-reactor
light: #c026d3
enemies: spark-wisps
mission: Restart the core
tags: Robotics, Embedded systems, CAD, Arduino, ESP32, STM32, 3D Printing, Prototyping

The heart of the station — and a short introduction to who Dayna is.

## Identity Bay
id: identity

I'm Dayna Gan, a Computer Engineering undergraduate at the National University of Singapore with a background in mechatronics, robotics, embedded systems and intelligent autonomous systems.

I enjoy working where software meets the physical world — from embedded firmware and sensor systems to robotics simulation, reinforcement learning and real-world deployment.

My work spans hands-on engineering, experimentation and applied research, with a focus on building systems that can move from prototype to real-world use.

### Robotics
### Embedded systems
### CAD
### Prototyping

## Status Console
id: currently

What I'm up to right now.

### Studying
Computer Engineering at NUS.

### Working
Hardware engineering at Ecovolt Technologies.

### Building
A drone — wrapping up now.

## Stat Reactor
id: stats

### 3.97
id: gpa
label: Diploma GPA / 4.00

### 4
id: internships
label: Engineering internships

### 100+
id: nav2-runs
label: Nav2 simulation runs evaluated

### 80+
id: volunteers
label: Volunteers led at RoboCup SG

# Education
id: education
eyebrow: 02 / Education
title: A path, one layer deeper each time.
kicker: From school robotics club to computer engineering
biome: academy-spires
light: #60a5fa
enemies: none
mission: Climb the spires

My academic path has moved progressively deeper into the intersection of electronics, software, control systems and intelligent machines.

## School of Science and Technology
id: sst
short: SST
qualification: GCE O-Levels · Elective: Computing+
period: TODO
grants: python +1, soldering +1, arduino +1

### O-Level subjects
id: sst-subjects
tags: English, Higher Chinese, Elementary Mathematics, Additional Mathematics, Pure Chemistry, Pure Physics, Computing, Combined Humanities (History, Social Studies)

### President, Robotics @APEX
id: sst-robotics
period: 2021
link: leadership/apex

Led the school robotics club, supporting members in robotics training, project development and competition preparation.

### MakeX Robotics Competition — Guangzhou
id: sst-makex
period: 2019

Overseas learning experience to Guangzhou for the Makeblock MakeX Robotics Competition 2019.

TODO: Result / role / what the team built.

### Overseas learning — Taiwan
id: sst-taiwan
status: todo

TODO: Year and what the trip covered.

### Robotics competitions
id: sst-competitions
status: todo

TODO: List of robotics competitions (name · year · result).

## Singapore Polytechnic
id: sp
short: SP
qualification: Diploma in Mechatronics and Robotics, with Merit
period: Apr 2022 – May 2025
grants: python +1, cpp +1, soldering +1, arduino +1, esp32 +1, stm32 +1, cad +1, inventor +1, 3d-printing +1

### Valedictorian, Class of 2025
id: valedictorian

### GPA 3.97 / 4.00
id: sp-gpa

### SP Engineering Scholarship
id: sp-scholarship

### Director’s Honour Roll
id: honour-roll
period: AY2022–2025

### Modules
id: sp-modules
tags: Systems & Control, Programmable Logic Controllers, Robotic Integration & Programming, Mobile Robotics

TODO: Complete the DMRO (2022 intake) module list — only modules confirmed from public SP course info are listed above.

### Polyforum 2023
id: sp-polyforum
period: 2023

### Pre-University Seminar 2023
id: sp-pre-u-seminar
period: 2023

### Skate Club & MMA Club
id: sp-clubs
tags: Skate Club, MMA Club

## National University of Singapore
id: nus
short: NUS
qualification: Bachelor of Engineering in Computer Engineering
period: Aug 2025 – Present
grants: python +1, cpp +1, java +1, verilog +1

### University Engineering Scholarship
id: nus-scholarship

### Computer Engineering core
id: nus-modules
tags: CG1111 Engineering Principles & Practice I, CG2111A Engineering Principles & Practice II, CS1010 Programming Methodology, CS1231 Discrete Structures, CS2040C Data Structures & Algorithms, CS2113 Software Engineering & OOP, CS2107 Introduction to Information Security, EE2026 Digital Design, CG2023 Signals & Systems, CG2027 Transistor-level Digital Circuits, CG2028 Computer Organization, CG2271 Real-time Operating Systems, CG3201 Machine Learning & Deep Learning, CG3207 Computer Architecture, EE4204 Computer Networks, CG4002 Computer Engineering Capstone Project

TODO: This is the CEG core curriculum for the AY2025/26 intake. Trim to the courses Dayna has taken (poly exemptions may apply) and mark any in progress.

### Skate Club
id: nus-skate
tags: NUS Skate Club

# Experience
id: experience
eyebrow: 03 / Experience
title: From soldering irons to world models.
kicker: Four deployments, four very different problems
biome: robot-forge
light: #f59e0b
enemies: welder-arms, scrap-crawlers
mission: Restart the assembly lines

From assembling robots to training intelligent agents — each factory hall is one role, in order.

## OTSAW Digital
id: otsaw
role: Robotics Intern
period: Jan 2022 – Mar 2022
tags: Autodesk Inventor, Soldering, Hands-on Assembly

Hands-on robotics production, electrical design and field deployment.

### TREX assembly
id: otsaw-trex
grants: soldering +1, assembly +1

Assembled and soldered components for three TREX robotic units, gaining hands-on experience in hardware production and prototyping.

### AirGuard electrical box
id: otsaw-airguard
grants: cad +1, inventor +1

Designed electrical-box circuitry for the AirGuard system using Autodesk Inventor.

### Camello field deployment
id: otsaw-camello

Supported the on-site deployment, maintenance and troubleshooting of Camello autonomous last-mile delivery robots in Punggol.

## A*STAR Institute for Infocomm Research
id: astar
short: A*STAR I²R
role: Robotics Intern
period: Sep 2024 – Feb 2025
tags: ROS 2, NVIDIA Isaac Sim, Nav2, LangChain

Robotics simulation, autonomy and natural-language interaction.

### Simulation platform evaluation
id: astar-isaac
grants: ros2 +1, isaac-sim +1

Spearheaded research evaluating NVIDIA Isaac Sim with ROS 2 as a potential primary simulation platform for future robotics projects at A*STAR’s Institute for Infocomm Research.

### ROSA agent
id: astar-rosa
link: projects/rosa-ros2
grants: python +1

Implemented a ROSA agent using LangChain to enable natural-language control of ROS 2 robots in Isaac Sim, contributing towards more accessible interfaces for autonomous robotic systems.

### Warehouse crowd simulations
id: astar-nav2
link: projects/isaac-nav2

Developed realistic warehouse crowd simulations using Omni.Anim.People and conducted more than 100 simulation runs to assess Nav2 path-planning accuracy and collision-avoidance performance under dynamic human movement.

## DSO National Laboratories
id: dso
short: DSO
role: Software Engineer Intern
period: May 2026 – Jul 2026
tags: Python, Reinforcement learning, SMAClite

A three-month research project in model-based reinforcement learning for multi-agent mission planning.

### R2-Dreamer × SMAClite
id: dso-dreamer
link: projects/dreamer-smaclite
grants: python +1, rl +1

Independently delivered a three-month research project integrating R2-Dreamer, a model-based reinforcement learning algorithm, into the SMAClite R2-2100 environment for multi-agent mission-planning applications.

### Experiments
id: dso-experiments

Designed and executed reward-shaping, adaptive-sampling, observability and actor-critic experiments, raising validation macro win rate from near zero to a best checkpoint of 55.6% while reducing battle timeouts and remaining enemy effective hit points.

### Generalisation
id: dso-generalisation

Evaluated policy generalisation on unseen scenarios, achieving 53.11% macro win rate on the blind-IID split and 59.25% on the blind-compositional split, and identified scenario-dependent policy and value generalisation as the primary performance bottleneck.

## Ecovolt Technologies
id: ecovolt
role: Hardware Engineer Intern
period: Jan 2026 – Present
tags: Embedded firmware, Sensor fusion, IoT, Field testing

Hardware, firmware, environmental sensing and real-world deployment.

### Euna Air bring-up
id: ecovolt-euna
link: projects/air-quality-sensor
grants: soldering +1, esp32 +1, assembly +1

Owned the hardware bring-up and customer deployment of Euna Air, an environmental monitoring and sensor-fusion solution, completing rigorous on-site validation at customer premises within one week.

### Firmware & field testing
id: ecovolt-firmware

Developed embedded firmware and field-testing procedures for Euna Air, identifying discrepancies between laboratory simulations and real-world operating conditions to support reliable deployment.

### Maxwell Ultra R&D
id: ecovolt-maxwell
grants: stm32 +1

Contributed to the R&D of Maxwell Ultra, an advanced occupancy-sensing system, and streamlined its production process ahead of deployment at a hotel partner.

### IoT edge-case investigation
id: ecovolt-iot

Investigated complex network edge cases across enterprise IoT deployments by systematically reproducing failure modes, auditing the firmware codebase and identifying operational bottlenecks.

# Projects
id: projects
eyebrow: 04 / Projects
title: Take it apart.
kicker: Every build, assembled by hand
biome: circuit-caverns
light: #22d3ee
enemies: short-circuit-bugs
mission: Recover the parts and build every project

Each project's components are scattered through the caverns. Find them, bring them to the project's blueprint room, and build it.

## Euna Air
id: air-quality-sensor
year: 2026
status: complete
tags: Embedded firmware, Sensor fusion, IoT, Field testing
requires: soldering 3, esp32 1
grants: esp32 +1

An environmental monitoring and sensor-fusion device that I brought up and deployed at customer premises during my hardware internship at Ecovolt.

Euna Air is Ecovolt Technologies' environmental monitoring and sensor-fusion solution. During my hardware engineering internship I owned its bring-up and customer deployment.

### Enclosure lid
id: lid

Top shell of the enclosure.

### Sensor array
id: sensor
learned: Identified discrepancies between laboratory simulations and real-world operating conditions.

The environmental sensors whose readings are fused into one picture of the room.

### Microcontroller & firmware
id: mcu
did: Developed embedded firmware and field-testing procedures for Euna Air.

Runs the embedded firmware that reads, fuses and reports sensor data.

### PCB
id: pcb
did: Owned the hardware bring-up of Euna Air.

Carries power and signals between the components.

### Enclosure base
id: base
did: Completed rigorous on-site validation at customer premises within one week.

Bottom shell with vents so air can reach the sensors.

## Dreamer × SMAClite
id: dreamer-smaclite
year: 2026
status: complete
tags: Python, Reinforcement learning, R2-Dreamer, SMAClite
requires: python 3, rl 1
grants: rl +1

Integrating R2-Dreamer, a model-based reinforcement learning agent, into the SMAClite multi-agent environment for mission planning.

A three-month research project at DSO National Laboratories. Improved validation macro win rate from near zero to a best checkpoint of 55.6%; achieved 53.11% on the blind-IID split and 59.25% on the blind-compositional split.

### World model
id: world-model
did: Integrated R2-Dreamer into the SMAClite R2-2100 environment.

A learned model of the environment that the agent "dreams" inside to plan ahead.

### Observation encoder
id: encoder
did: Designed and tested observability experiments.

Compresses what each agent can see into a latent state.

### Actor
id: actor
did: Designed and tested actor-critic and reward-shaping experiments.

The policy that chooses actions for each unit.

### Critic
id: critic
learned: Identified scenario-dependent policy and value generalisation as the main performance bottleneck.

Estimates the value of each state so the actor can improve.

### Adaptive sampler
id: replay
did: Designed and tested adaptive-sampling experiments.

Chooses which scenarios the agent trains on next.

### SMAClite units
id: units
did: Achieved 53.11% macro win rate on the blind-IID split and 59.25% on the blind-compositional split.

The multi-agent team controlled by the policy.

## ROSA × ROS 2
id: rosa-ros2
year: 2024
status: complete
tags: ROS 2, LangChain, ROSA, NVIDIA Isaac Sim, Python
requires: python 2, ros2 1
grants: ros2 +1, isaac-sim +1

A LangChain-based ROSA agent that turns plain-English instructions into ROS 2 commands for robots simulated in NVIDIA Isaac Sim.

Built during my robotics internship at A*STAR I²R. ROSA (the Robot Operating System Agent) lets an operator control a ROS 2 robot in plain English instead of memorising topic names and message formats.

### ROSA agent core
id: brain
did: Implemented a ROSA agent using LangChain to support natural-language control of ROS 2 robots in Isaac Sim.

The LLM agent that interprets natural-language instructions and plans which ROS 2 tools to call.

### Tool layer
id: tools

LangChain tools that wrap ROS 2 topics, services and parameters so the agent can act on the robot.

### ROS 2 compute deck
id: compute

The ROS 2 node graph that carries commands from the agent down to the robot.

### Lidar
id: lidar

Perception sensor the agent can query to describe its surroundings.

### Simulated chassis
id: chassis
did: Evaluated NVIDIA Isaac Sim with ROS 2 as a possible primary simulation platform for future robotics projects.

The robot body, simulated in NVIDIA Isaac Sim.

### Drive wheels
id: wheels

Differential drive, receiving velocity commands published by the agent.

## Isaac Sim × Nav2
id: isaac-nav2
year: 2024
status: complete
tags: NVIDIA Isaac Sim, ROS 2, Nav2, Omni.Anim.People
requires: ros2 2, isaac-sim 2
needs: rosa-ros2
grants: nav2 +1, ros2 +1, isaac-sim +1

Warehouse crowd simulations in NVIDIA Isaac Sim, used to stress-test Nav2 path planning and collision avoidance around moving people.

Part of my robotics internship at A*STAR I²R: can a robot navigate a busy warehouse safely when people keep walking into its path?

### Nav2 planner
id: planner
did: Conducted more than 100 simulation runs to evaluate Nav2 path planning and collision avoidance under dynamic human movement.

Global and local planners that choose a path and avoid collisions.

### Mobile robot
id: robot

The navigating robot, driven by Nav2 through ROS 2.

### Simulated people
id: people
did: Built realistic warehouse crowd simulations using Omni.Anim.People.

Animated pedestrians that make the environment dynamic.

### Warehouse racking
id: shelves

Static warehouse geometry that shapes the navigation corridors.

### Environment
id: floor

The Isaac Sim warehouse scene used for every test run.

## Remote-controlled robot claw
id: robot-claw
status: in-progress
tags: Servos, Microcontrollers, CAD, 3D Printing
requires: cad 2, arduino 2
grants: cad +1, arduino +1, 3d-printing +1

A remotely operated gripper — full case study coming soon.

TODO: Case study (problem, what I did, result, photos).

### Gripper fingers
id: fingers

The jaws that open and close around an object.

### Wrist servo
id: wrist

Drives the gripper open and closed.

### Arm link
id: arm

Structural link between the base and the gripper.

### Base joint
id: joint

Rotating joint that lifts the arm.

### Base & receiver
id: claw-base

Houses the electronics that receive commands from the remote.

### Remote controller
id: remote

The handheld input that drives the claw.

## Drone
id: drone
year: 2026
status: in-progress
tags: Flight control, Embedded systems
requires: soldering 3, 3d-printing 2, esp32 2
needs: robot-claw, air-quality-sensor
grants: assembly +1, esp32 +1, 3d-printing +1

A drone build that is wrapping up now — photos and write-up landing soon.

TODO: Photos, flight footage and the full write-up.

### Propellers
id: props

Four rotors that generate lift.

### Motors
id: motors

Brushless motors that spin each propeller.

### Flight controller
id: fc

Keeps the drone stable and turns stick inputs into motor commands.

### Frame
id: frame

The X-frame that holds everything together.

### Battery
id: battery

Powers the motors and electronics.

# Skills & Awards
id: trophies
eyebrow: 05 / Skills & awards
title: The toolkit.
kicker: What I work with, and what it has earned
biome: trophy-hall
light: #fbbf24
enemies: none
mission: Fill the shelves

The languages, platforms and tools I reach for — and some recognition picked up along the way.

## Awards Wing
id: awards

### Valedictorian
id: award-valedictorian
org: Singapore Polytechnic
period: 2025

### University Engineering Scholarship
id: award-nus-scholarship
org: National University of Singapore

### A*STAR Science Award (Polytechnic)
id: award-astar
org: A*STAR
period: 2023–2024

### SP Engineering Scholarship
id: award-sp-scholarship
org: Singapore Polytechnic

### SP Engineering Merit Award
id: award-sp-merit
org: Singapore Polytechnic
period: 2023–2025

### Director’s Honour Roll
id: award-honour-roll
org: Singapore Polytechnic
period: AY2022–2025

### Edusave Skills Award
id: award-edusave
org: Ministry of Education
period: 2025

### Certifications
id: certifications
status: todo

TODO: Any certifications to display.

## Collection Shelves
id: shelves

A plinth for every project. Place your built models here.

## Skill Matrix
id: skill-matrix

Every skill Dayna has picked up, and exactly where each level came from.

## Backroom
id: backroom
hidden: true
status: todo

TODO: Secret content — revealed when every project model is on the shelves.

# Leadership & Community
id: leadership
eyebrow: 06 / Leadership
title: Building people, too.
kicker: Clubs, committees and community
biome: colony-commons
light: #34d399
enemies: none
mission: Meet the colony

## Robotics @APEX, SST
id: apex
role: President
period: 2021
grants: leadership +1

### Club leadership
id: apex-lead

Led the school robotics club and supported members in robotics training, project development and competition preparation.

## RoboCup Singapore Student Organising Committee
id: robocup
role: Chairperson
period: Oct 2022 – Apr 2023
grants: leadership +1

### Led 80+ volunteers
id: robocup-committee

Led a student organising committee of more than 80 volunteers for the RoboCup Singapore Open, coordinating across students, mentors and external stakeholders.

### Event operations
id: robocup-ops

Managed event planning, volunteer scheduling and on-site operations to deliver a smooth competition experience.

## SP LEO Club
id: leo
role: Welfare Head
period: Mar 2023 – Mar 2024
grants: leadership +1

### Active-ageing outreach
id: leo-outreach

Organised active-ageing and outreach initiatives for senior beneficiaries, including social engagement and enrichment activities.

### Programme design
id: leo-programmes

Designed programmes addressing the social and emotional needs of elderly participants.

## TOUCH Community Services
id: touch
role: Youth Mentor
period: Sep 2022 – Present
grants: leadership +1

### Mentoring
id: touch-mentoring

Mentor children from disadvantaged backgrounds through sustained academic support, personal guidance and enrichment activities.

### Engagement programmes
id: touch-programmes

Plan and facilitate celebration and engagement programmes to foster a supportive learning environment.

# GitHub
id: github
eyebrow: 07 / GitHub
title: Commit history.
kicker: What I'm building right now
biome: mainframe
light: #4ade80
enemies: malware-packets
boss: merge-conflict
mission: Reboot the mainframe

A window into what I'm building, exploring and updating on GitHub. Live data is fetched from GitHub and refreshed hourly.

## Contribution Grid
id: contributions

## Repo Racks
id: repos

## Commit Feed
id: commits

# Contact
id: contact
eyebrow: 08 / Contact
title: Let's build something.
kicker: Robotics, embedded systems, or whatever comes next
biome: comms-array
light: #a78bfa
enemies: static-drones
mission: Align the dish and send a transmission

Great systems start with a conversation. Let's talk robotics, embedded systems, or what we could build next.

## Transmission Console
id: form
reasons: Internship / job, Project collaboration, Research, Just saying hi

TRANSMISSION RECEIVED — thanks for reaching out. I'll reply soon.
