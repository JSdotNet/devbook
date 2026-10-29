workspace "jsdotnet-devbook" {

    !identifiers hierarchical

    model {
        maintainer = person "The maintainer" "Authors every asset by hand, runs the checks, and releases every plugin at one version."

        marketplace = softwareSystem "jsdotnet-devbook marketplace" "The Claude Code plugin marketplace of agents, skills, rules, and hooks that drive delivery work." {

            group "L0 foundation" {
                devbook = container "devbook" "Addressed Markdown chapters, their meta block, the check, and the reconcile that puts the convention into a repository." "Claude Code plugin" {
                    chapter = component "Chapter" "One addressable heading with its meta block, the block's consistency boundary." "Markdown"
                    meta-block = component "Meta Block" "The flat block under a heading that turns it into a graph node." "YAML"
                    devbook-folder = component "Devbook Folder" "One of the governed folders under .devbook and the unit of adoption." "Markdown"
                    change = component "Change" "A proposed change folder whose deltas merge into the chapters it lands in." "Markdown"
                    demo = component "Demo" "A self-contained HTML page showing what a person sees in a bounded context." "HTML"
                    c4-model = component "C4 Model" "The Structurizr DSL workspace of an arc42 folder and the reader that checks it." "Structurizr DSL"
                    reference-graph = component "Reference Graph" "The derived graph of every chapter as a node and every reference as an edge." "JSON"
                    reconciler = component "Reconciler" "Brings a repository level with the installed release and stamps what it materialized." "Skill"
                    index-generator = component "Index Generator" "The checker that walks the corpus and builds the graph, the outline, and the registers." "Node.js"
                    chapter-review = component "Chapter Review" "Reads a chapter against its folder's rules and posts one note per objection through devbook.decision@1." "Skill"
                    tech-inventory = component "Tech Inventory" "Scripts that read package manifests and emit deterministic JSON." "Node.js"
                    scenario-tools = component "Scenario Tools" "The runner, reporter, signature, coverage check, and demo sync that tie end-to-end specs to scenario pages." "Node.js"

                    group "devbook-code-sync" {
                        unit-lister = component "Unit Lister" "Lists every sync unit and group with its effective sync direction." "Node.js"
                        spec-converter = component "Spec Converter" "The capture, apply, and verify skills, one service between a chapter and its code." "Skill"
                    }

                    group "devbook-procedures" {
                        procedure = component "Procedure" "One of the five repository-owned skills run, capture, diagnose, estimate, and prototype." "Skill"
                        goal = component "Goal" "The one sentence a procedure must satisfy, rendered into its wrappers." "Markdown"
                        demo-template = component "Demo Template" "The starting HTML template with a managed region every demo is built on." "HTML"
                    }
                }

                delivery = container "delivery" "The delivery engine: one unit of work carried from request to review-ready change inside one session." "Claude Code plugin" {
                    run = component "Run" "One execution of one flow over one unit of work, with its stages, gate decisions, and outcome."
                    flow = component "Flow" "A staged procedure named for what it changes, running a fixed phase order in one session." "Skill"
                    stack-config = component "Stack Config" "The engine-owned keys of the repository's config: bindings, phases, policy, gates, and areas." "JSON"
                    flow-runner = component "Flow Runner" "The agent that sequences a flow's phases, resolves each phase entry, tracks the run, and holds every gate." "Agent"

                    group "delivery-phases" {
                        phase = component "Phase" "The unit a repository configures: one stable id, one phase skill, and one entry per flow." "Skill"
                        gate = component "Gate" "A human checkpoint on a phase that a person answers with approve, revise, or decline."
                    }

                    group "delivery-pr-lane" {
                        pull-request-lane = component "Pull Request Lane" "Pushes, updates, fixes the checks of, and scores a finished pull request until it is merge-ready." "Skill"
                    }
                }

                devbook-config = container "devbook-config" "What this stack is, what this machine has, and how this repository is wired." "Claude Code plugin" {
                    stack-report = component "Stack Report" "Reads what is on disk and gives every fact with the source it came from." "Node.js"
                    engine-configuration = component "Engine Configuration" "The engine keys this block alone writes into the stack config." "JSON"
                    init-service = component "Init Service" "Writes a repository's engine keys the first time, then runs each component's own init." "Skill"
                    update-service = component "Update Service" "Moves the configured stack forward by running each adopted component's own update." "Skill"
                    ask-service = component "Ask Service" "Answers questions about the marketplace from what is on disk, writing nothing." "Skill"
                    adoption-drift = component "Adoption Drift" "Reports where the ai/ adoption record has drifted from what is installed and wired." "Skill"
                }

                devbook-skills = container "devbook-skills" "Reusable guidance any plugin names and none depends on." "Claude Code plugin" {
                    show-me = component "Show-me Catalog" "Pairs each kind of content with the picture that shows it." "Skill"
                    research-brief = component "Research Brief" "A question answered from primary sources, each claim cited with its confidence." "Skill"
                    pr-body = component "PR Body" "A pull request description in Summary, Evidence, and Merge Danger." "Skill"
                    retro = component "Retro Lenses" "Ten lenses, each pairing what to look for with the change it calls for." "Skill"
                    wayfinder = component "Wayfinder Map" "An effort too big for one session planned as a map of decision tickets." "Skill"
                }
            }

            group "L1 extension" {
                devbook-derived = container "devbook-derived" "The committed _meta/ index, its refresh paths, the rendered C4 views, and the graph canvas." "Claude Code plugin" {
                    refresh-paths = component "Refresh Paths" "The skill, script, and workflows that rewrite the committed _meta/ indexes." "PowerShell, GitHub Actions"
                    view-renderer = component "View Renderer" "Draws every C4 view of the workspace as a committed SVG." "Node.js"
                    canvas = component "Canvas" "Two Copilot canvases drawing the reference graph and one chapter live." "Copilot extension"
                }

                devbook-openspec = container "devbook-openspec" "The change lane: OpenSpec installed and configured so a change is a set of deltas against the chapters." "Claude Code plugin" {
                    schema = component "Schema" "The project schema defining a change's artifacts from proposal through deltas to tasks." "YAML"
                    config = component "Config" "The seeded OpenSpec config with context, per-artifact rules, and apply and archive routing." "YAML"
                    change-rule = component "Change Rule" "The host rule that keeps OpenSpec's skills to devbook's change shape inside a change folder." "Markdown"
                    step-state = component "Step State" "Works out each step's state from the ticked tasks file, never from a branch." "Skill"
                    landing = component "Landing a Change" "Checks the gates, merges the deltas, and has OpenSpec move the change." "Skill"
                    stamp = component "Stamp" "Records the plugin version, the CLI range, and the materialized files." "JSON"
                }

                delivery-schedule = container "delivery-schedule" "Work that runs with nobody watching, and the catalog of triggers that fires it." "Claude Code plugin" {
                    schedule = component "Schedule" "One trigger pairing a cadence, a target, the plugins it needs, and a self-contained prompt." "Markdown"
                    schedule-selection = component "Schedule Selection" "The schedules a repository chose and the cadence overrides it set." "JSON"
                    scheduler-resolution = component "Scheduler Resolution" "Finds the host's scheduler in the live session and creates, updates, disables, reads, or fires entries through it." "Skill"
                    catalog-check = component "Catalog Check" "Rejects a malformed catalog entry, a cadence above hourly, a flow target, and an unnamed placeholder." "Node.js"

                    group "delivery-schedule-entry-points" {
                        entry-point = component "Entry Point" "A schedule-* skill that picks its own input and runs unattended without passing a gate." "Skill"
                    }
                }
            }

            group "Surface" {
                delivery-surface-dashboard = container "delivery-surface-dashboard" "The live view of a run, measured by hooks rather than told." "MCP server" {
                    run-record = component "Run Record" "One run with its stages, prompts, evidence, gate decisions, telemetry, and handoff marker, kept per worktree." "JSON"
                    viewer = component "Viewer" "The run timeline, diagram viewer, and document viewer pages, inline or on a loopback origin." "HTML"
                    report-export = component "Report Export" "Writes the run's report from the recorded data as Markdown or self-contained HTML." "Node.js"
                    telemetry-capture = component "Telemetry Capture" "A hook on the host's tool events folding tool calls, sub-agents, and tokens into the run record." "Command hook"
                }

                delivery-surface-collector = container "delivery-surface-collector" "A run recorded to disk rather than watched, for unattended sessions." "MCP server" {
                    run-record = component "Run Record" "One unattended run kept on disk with stages, gate decisions, evidence paths, and a handoff marker." "JSON"
                    report-export = component "Report Export" "Writes the run's report from the recorded data, in Markdown only." "Node.js"
                }

                delivery-surface-backlog = container "delivery-surface-backlog" "A run shown in the Backlog desktop app, where its work item already lives." "MCP server" {
                    proxy-server = component "Proxy Server" "The stdio server that forwards lifecycle and export calls to the endpoint inside the running Backlog app." "MCP server"
                    endpoint = component "Endpoint" "The Backlog address and bearer token, from the environment, then settings, then the default port." "Node.js"
                    declared-tools = component "Declared Tools" "The tool names this server lists and forwards, export only while Backlog lists it." "MCP server"
                }

                delivery-surface-canvas = container "delivery-surface-canvas" "Mermaid and Markdown rendered live beside the files they came from, on one host and with no marketplace entry." "Copilot extension" {
                    view = component "View" "The diagram or document a canvas shows, with its breadcrumb history and nothing persisted." "HTML"
                    canvas-transport = component "Canvas Transport" "Registers the two canvases, serves their pages on a loopback port with a token, and pushes view changes." "Copilot extension"
                }
            }

            group "Viewer" {
                delivery-run-view = container "delivery-run-view" "A run drawn inside Claude Code from the files the surfaces write; not a surface." "Claude Code mod" {
                    register-module = component "Register Module" "Polls the run files, infers what they leave out, and draws the pane, band, rows, status line, and gate alerts." "TypeScript"
                    state-contract = component "State Contract" "The type declarations of the state the module keeps." "TypeScript"
                    gate-sound = component "Gate Sound" "The clip played when a run reaches a gate or blocks." "WAV"
                }

                devbook-config-view = container "devbook-config-view" "Every repository on this machine, its stamps against the newest and its phase maps, drawn inside Claude Code." "Claude Code mod" {
                    register-module = component "Register Module" "Finds the repositories, reads their configs, and draws the rollout pane." "TypeScript"
                    state-contract = component "State Contract" "The type contract of the rollout state the module keeps." "TypeScript"
                }
            }
        }

        claude-code = softwareSystem "Claude Code" "The authoring host that loads manifests, skills, agents, hooks, and MCP servers, and runs scheduled routines." "External"
        copilot = softwareSystem "GitHub Copilot" "The second host, loading the same manifest, skill, and hook files and its own extensions." "External"
        repository = softwareSystem "A consuming repository" "A repository that installs a component and keeps its stamp in .devbook/config.json." "External"
        github = softwareSystem "GitHub" "Runs the checks on every pull request, refreshes the index on a schedule, and is the tracker a flow reports to." "External"
        routine = softwareSystem "Scheduled local routine" "Starts a session in a fresh worktree of a repository on the maintainer's machine, with nobody watching." "External"
        backlog = softwareSystem "Backlog desktop app" "Holds the work items, reads the committed _meta/ index off disk, and answers as a surface." "External"

        # Context
        maintainer -> marketplace "Writes every asset, runs the checks, and tags a release" "git"
        claude-code -> marketplace "Installs a plugin and loads its manifests, skills, and hooks" "Claude Code plugin API"
        copilot -> marketplace "Installs a plugin and loads its manifests, skills, and hooks" "Copilot plugin API"
        marketplace -> repository "Materializes rules, tools, workflows, one AGENTS.md section, and a stamp" "init and update"
        repository -> github "Runs the check and opens pull requests" "GitHub Actions"
        routine -> repository "Runs a schedule entry point in a fresh worktree"
        backlog -> repository "Reads the committed _meta/ index and graph off disk"

        # Who uses which plugin
        maintainer -> marketplace.devbook-config "Sets a repository up and moves it forward"
        maintainer -> marketplace.delivery "Asks for a change and answers its Personal Validation gate"
        claude-code -> marketplace.delivery "Runs a flow skill in a session" "Claude Code plugin API"
        claude-code -> marketplace.delivery-surface-dashboard.telemetry-capture "Fires a tool event" "command hook"
        claude-code -> marketplace.delivery-run-view.register-module "Loads the mod and calls it on every refresh" "function hook"
        claude-code -> marketplace.devbook-config-view.register-module "Loads the mod and calls it on every refresh" "function hook"
        copilot -> marketplace.delivery-surface-canvas.canvas-transport "Loads the extension at run time" "Copilot Extension SDK"
        copilot -> marketplace.devbook-derived.canvas "Loads the extension at run time" "Copilot Extension SDK"
        routine -> marketplace.delivery-schedule.entry-point "Fires the entry point its schedule targets"
        github -> marketplace.devbook-derived.refresh-paths "Runs the nightly refresh and the drift warning" "GitHub Actions"

        # Between plugins, in the direction of the coupling
        marketplace.devbook-derived -> marketplace.devbook "Builds the index with the checker it ships" "dependencies: devbook >=1.1.0 <2.0.0"
        marketplace.devbook-openspec -> marketplace.devbook "Lands a change as deltas against the chapters" "dependencies: devbook >=1.32.0 <2.0.0"
        marketplace.delivery-schedule -> marketplace.delivery "Targets the engine's skills and never a flow" "dependencies: delivery >=1.0.0 <2.0.0"
        marketplace.delivery-schedule -> marketplace.devbook "Names prose-check and the devbook checks as targets" "undeclared"
        marketplace.delivery -> marketplace.devbook "Drafts devbook folders with flow-spec and checks chapters at spec-check" "undeclared, TDR 4"
        marketplace.delivery -> marketplace.devbook "Names the procedures run and capture, never the plugin" "skill name"
        marketplace.delivery -> marketplace.devbook-config "Runs devbook-config:init for a project change" "undeclared"
        marketplace.devbook-openspec -> marketplace.delivery "Ships a spec and a tracker provider the engine binds by name" "binding"
        marketplace.devbook -> marketplace.devbook-skills "Names show-me, never the plugin" "skill name"
        marketplace.delivery -> marketplace.devbook-skills "Names show-me, research-brief, pr-body, and retro, never the plugin" "skill name"
        marketplace.delivery-schedule -> marketplace.devbook-skills "Names pr-body and retro, never the plugin" "skill name"
        marketplace.devbook-config -> marketplace.devbook "Runs its init and update and reads its stamp" "undeclared"
        marketplace.devbook-config -> marketplace.devbook-derived "Runs its init and update and reads its stamp" "undeclared"
        marketplace.devbook-config -> marketplace.delivery "Runs its init and update and reads its stamp" "undeclared"
        marketplace.devbook-config -> marketplace.delivery-schedule "Runs its init and update and reads its stamp" "undeclared"
        marketplace.delivery -> marketplace.delivery-surface-dashboard "Reports a run, renders, and exports" "delivery.surface.*@1"
        marketplace.delivery -> marketplace.delivery-surface-collector "Reports a run and exports" "delivery.surface.lifecycle@1, export@1"
        marketplace.delivery -> marketplace.delivery-surface-backlog "Reports a run" "delivery.surface.lifecycle@1"
        marketplace.delivery -> marketplace.delivery-surface-canvas "Renders a diagram or a document" "delivery.surface.render@1"
        marketplace.delivery-run-view -> marketplace.delivery-surface-dashboard "Reads its run files" "file"
        marketplace.delivery-run-view -> backlog "Reads the run files the app writes" "file"
        marketplace.devbook-config-view -> marketplace.devbook-config "Repeats its stamp and retired-key tables" "copied tables"
        marketplace.devbook-config-view -> marketplace.delivery "Repeats its default runs and resolution rules" "copied tables"
        marketplace.devbook-config -> marketplace.devbook-openspec "Runs its init and writes its spec and tracker bindings" "undeclared"
        marketplace.delivery-schedule -> marketplace.devbook-config "Runs its update from schedule-devbook-update" "skill name"

        # Out of the marketplace
        marketplace.devbook -> repository "Copies its payload, runs its migrations, and writes components.devbook" "devbook:init and update"
        marketplace.devbook-derived -> repository "Writes the refresh script and workflows and stamps components.derived" "devbook-derived:init and update"
        marketplace.delivery -> repository "Writes components.delivery" "delivery:init and update"
        marketplace.devbook-config -> repository "Writes the engine keys of .devbook/config.json" "devbook-config:init and update"
        marketplace.delivery -> github "Opens the pull request and reports back to the tracker" "gh"
        marketplace.delivery-schedule.scheduler-resolution -> claude-code "Creates, updates, and fires a routine per selected schedule" "the live session's scheduler"
        marketplace.delivery-schedule.scheduler-resolution -> copilot "Creates, updates, and fires an automation per selected schedule" "the live session's scheduler"
        marketplace.delivery-surface-backlog.proxy-server -> backlog "Forwards each call to /mcp inside the app" "streamable HTTP, loopback"
        marketplace.devbook-config-view.register-module -> repository "Reads .devbook/config.json of every repository on the machine" "file"

        # devbook
        marketplace.devbook.devbook-folder -> marketplace.devbook.chapter "Holds"
        marketplace.devbook.devbook-folder -> marketplace.devbook.demo "Holds"
        marketplace.devbook.chapter -> marketplace.devbook.meta-block "Carries"
        marketplace.devbook.change -> marketplace.devbook.chapter "Merges its deltas into"
        marketplace.devbook.index-generator -> marketplace.devbook.reference-graph "Builds, with the workspace's elements and views in it"
        marketplace.devbook.index-generator -> marketplace.devbook.c4-model "Reads, and checks every embed and identifier against"
        marketplace.devbook.chapter-review -> marketplace.devbook.chapter "Reads against its folder's rules"
        marketplace.devbook.chapter-review -> backlog "Reads and posts review notes, where it answers the group" "devbook.decision@1"
        marketplace.devbook.reconciler -> marketplace.devbook.devbook-folder "Adopts and drops"
        marketplace.devbook.reconciler -> marketplace.devbook.scenario-tools "Materializes"
        marketplace.devbook.reconciler -> marketplace.devbook.tech-inventory "Materializes"
        marketplace.devbook.unit-lister -> marketplace.devbook.reference-graph "Reads the units and groups off"
        marketplace.devbook.spec-converter -> marketplace.devbook.unit-lister "Takes its unit and group scope from"
        marketplace.devbook.spec-converter -> marketplace.devbook.chapter "Writes, in its folder's shape"
        marketplace.devbook.procedure -> marketplace.devbook.goal "Carries"
        marketplace.devbook.procedure -> marketplace.devbook.demo-template "Builds a demo on"
        marketplace.devbook.reconciler -> marketplace.devbook.procedure "Seeds, wraps, and stamps"
        marketplace.devbook.reconciler -> marketplace.devbook.demo-template "Seeds"

        # devbook-derived
        marketplace.devbook-derived.refresh-paths -> marketplace.devbook.index-generator "Runs with --write" "build.mjs"
        marketplace.devbook-derived.refresh-paths -> marketplace.devbook-derived.view-renderer "Runs after the index write"
        marketplace.devbook-derived.view-renderer -> marketplace.devbook.c4-model "Reads the workspace through devbook's reader" "c4.mjs"
        marketplace.devbook-derived.canvas -> marketplace.devbook.reference-graph "Draws"

        # devbook-openspec
        marketplace.devbook-openspec.config -> marketplace.devbook-openspec.schema "Selects"
        marketplace.devbook-openspec.config -> marketplace.devbook-openspec.landing "Routes a change through"
        marketplace.devbook-openspec.landing -> marketplace.devbook-openspec.step-state "Checks the gates through"
        marketplace.devbook-openspec.change-rule -> marketplace.devbook.change "Keeps OpenSpec's skills to the shape of"
        marketplace.devbook-openspec.landing -> marketplace.devbook.change "Merges the deltas of"

        # devbook-config
        marketplace.devbook-config.init-service -> marketplace.devbook-config.stack-report "Starts from"
        marketplace.devbook-config.init-service -> marketplace.devbook-config.engine-configuration "Writes"
        marketplace.devbook-config.update-service -> marketplace.devbook-config.stack-report "Fans out over the scope verdict of"
        marketplace.devbook-config.update-service -> marketplace.devbook-config.engine-configuration "Re-validates"
        marketplace.devbook-config.ask-service -> marketplace.devbook-config.stack-report "Takes the state half of its answer from"
        marketplace.devbook-config.adoption-drift -> marketplace.devbook-config.stack-report "Compares the adoption record against"
        marketplace.devbook-config.init-service -> marketplace.devbook.reconciler "Runs devbook:init"
        marketplace.devbook-config.update-service -> marketplace.devbook.reconciler "Runs devbook:update"
        marketplace.devbook-config.engine-configuration -> marketplace.delivery.stack-config "Is the writer of"

        # devbook-skills
        marketplace.devbook-skills.pr-body -> marketplace.devbook-skills.show-me "Picks its Summary view from"
        marketplace.devbook-skills.wayfinder -> marketplace.devbook-skills.research-brief "Resolves a research ticket through"
        marketplace.devbook-skills.wayfinder -> github "Writes the map and its tickets" "the repository's tracker"

        # delivery
        marketplace.delivery.flow-runner -> marketplace.delivery.flow "Sequences"
        marketplace.delivery.flow-runner -> marketplace.delivery.run "Opens and advances"
        marketplace.delivery.flow-runner -> marketplace.delivery.stack-config "Resolves each phase entry from"
        marketplace.delivery.flow-runner -> marketplace.delivery.phase "Runs inline, forked, or delegated"
        marketplace.delivery.flow-runner -> marketplace.delivery.gate "Holds"
        marketplace.delivery.flow -> marketplace.delivery.phase "Runs in order"
        marketplace.delivery.stack-config -> marketplace.delivery.phase "Configures through one entry per flow"
        marketplace.delivery.stack-config -> marketplace.delivery.gate "Adds"
        marketplace.delivery.gate -> marketplace.delivery.phase "Presents the output of, and re-runs on revise"
        marketplace.delivery.phase -> marketplace.delivery.pull-request-lane "Hands a branch under review to"
        marketplace.delivery.phase -> marketplace.devbook.spec-converter "Checks the chapters at spec-check with verify-change"
        marketplace.delivery.phase -> marketplace.devbook.procedure "Runs run and capture by skill name"
        marketplace.delivery.run -> marketplace.delivery-surface-dashboard.run-record "Is reported into"
        marketplace.delivery.run -> marketplace.delivery-surface-collector.run-record "Is reported into"
        marketplace.delivery.run -> marketplace.delivery-surface-backlog.proxy-server "Is reported through"
        marketplace.delivery.pull-request-lane -> github "Pushes, updates, and fixes the checks of a pull request" "gh"

        # delivery-schedule
        marketplace.delivery-schedule.schedule-selection -> marketplace.delivery-schedule.schedule "Selects, and overrides the cadence of"
        marketplace.delivery-schedule.scheduler-resolution -> marketplace.delivery-schedule.schedule "Creates, updates, disables, and fires"
        marketplace.delivery-schedule.catalog-check -> marketplace.delivery-schedule.schedule "Validates the shipped entries of"
        marketplace.delivery-schedule.schedule -> marketplace.delivery-schedule.entry-point "Targets"
        marketplace.delivery-schedule.entry-point -> github "Lands what it did as a draft pull request or an issue" "gh"
        marketplace.delivery-schedule.entry-point -> marketplace.delivery-surface-collector.run-record "Records its run into"

        # Surfaces
        marketplace.delivery-surface-dashboard.viewer -> marketplace.delivery-surface-dashboard.run-record "Reads"
        marketplace.delivery-surface-dashboard.report-export -> marketplace.delivery-surface-dashboard.run-record "Reads whole"
        marketplace.delivery-surface-dashboard.telemetry-capture -> marketplace.delivery-surface-dashboard.run-record "Writes measured telemetry into"
        marketplace.delivery-surface-collector.report-export -> marketplace.delivery-surface-collector.run-record "Reads whole and writes Markdown from"
        marketplace.delivery-surface-backlog.proxy-server -> marketplace.delivery-surface-backlog.endpoint "Resolves and re-resolves the app's address through"
        marketplace.delivery-surface-backlog.proxy-server -> marketplace.delivery-surface-backlog.declared-tools "Lists and forwards only"
        marketplace.delivery-surface-canvas.canvas-transport -> marketplace.delivery-surface-canvas.view "Pushes changes to the open page of"

        # Viewers
        marketplace.delivery-run-view.register-module -> marketplace.delivery-run-view.state-contract "Keeps its state in the shape of"
        marketplace.delivery-run-view.register-module -> marketplace.delivery-run-view.gate-sound "Plays on a gate alert"
        marketplace.delivery-run-view.register-module -> marketplace.delivery-surface-dashboard.run-record "Polls" "file"
        marketplace.delivery-run-view.register-module -> backlog "Polls the run files the app writes" "file"
        marketplace.devbook-config-view.register-module -> marketplace.devbook-config-view.state-contract "Keeps its rollout state in the shape of"
    }

    views {
        systemContext marketplace "context" "The marketplace, the person who authors it, the two hosts that load it, and the systems its plugins reach." {
            include *
            autolayout lr
        }

        container marketplace "plugins" "The thirteen plugins grouped by layer, every arrow in the direction of the coupling." {
            include *
            autolayout tb
        }

        component marketplace.devbook "devbook" "The chapter, the folder, the check, and the reconcile inside devbook, with its two nested blocks." {
            include *
            autolayout lr
        }

        component marketplace.devbook "devbook-code-sync" "The two parts that bring a chapter and its code back into agreement." {
            include marketplace.devbook.unit-lister marketplace.devbook.spec-converter marketplace.devbook.reference-graph marketplace.devbook.chapter marketplace.delivery.phase
            autolayout lr
        }

        component marketplace.devbook "devbook-procedures" "The five procedures, their goal, and the demo template devbook seeds." {
            include marketplace.devbook.procedure marketplace.devbook.goal marketplace.devbook.demo-template marketplace.devbook.reconciler marketplace.delivery.phase
            autolayout lr
        }

        component marketplace.devbook-derived "devbook-derived" "The refresh paths, the view renderer, and the canvas." {
            include *
            autolayout lr
        }

        component marketplace.devbook-openspec "devbook-openspec" "The schema, the config, the change rule, and how a change lands." {
            include *
            autolayout lr
        }

        component marketplace.devbook-config "devbook-config" "The stack report, the engine configuration, and the services over them." {
            include *
            autolayout lr
        }

        component marketplace.devbook-config-view "devbook-config-view" "The register module and the state it keeps." {
            include *
            autolayout lr
        }

        component marketplace.devbook-skills "devbook-skills" "The five pieces of guidance and the two that lean on another." {
            include *
            autolayout lr
        }

        container marketplace "devbook-skills-dependencies" "The three plugins that name a devbook-skills skill, and the tracker wayfinder writes to." {
            include marketplace.devbook-skills marketplace.devbook marketplace.delivery marketplace.delivery-schedule github
            autolayout lr
        }

        component marketplace.delivery "delivery" "The run, the flow, the stack config, and the flow runner, with the phases and the pull-request lane inside." {
            include *
            autolayout lr
        }

        component marketplace.delivery "delivery-phases" "The phase and the gate a repository may add to it." {
            include marketplace.delivery.phase marketplace.delivery.gate marketplace.delivery.flow-runner marketplace.delivery.flow marketplace.delivery.stack-config marketplace.delivery.pull-request-lane
            autolayout lr
        }

        component marketplace.delivery "delivery-pr-lane" "The pull-request lane and what hands it a branch." {
            include marketplace.delivery.pull-request-lane marketplace.delivery.phase github
            autolayout lr
        }

        component marketplace.delivery-schedule "delivery-schedule" "The schedule, its selection, the scheduler resolution, and the catalog check." {
            include *
            autolayout lr
        }

        component marketplace.delivery-schedule "delivery-schedule-entry-points" "The entry point a schedule targets and where its work lands." {
            include marketplace.delivery-schedule.entry-point marketplace.delivery-schedule.schedule routine github marketplace.delivery-surface-collector
            autolayout lr
        }

        component marketplace.delivery-surface-dashboard "delivery-surface-dashboard" "The run record and the three parts that fill and read it." {
            include *
            autolayout lr
        }

        component marketplace.delivery-surface-collector "delivery-surface-collector" "The run record and its export." {
            include *
            autolayout lr
        }

        component marketplace.delivery-surface-backlog "delivery-surface-backlog" "The proxy, the endpoint it resolves, and the tools it declares." {
            include *
            autolayout lr
        }

        component marketplace.delivery-surface-canvas "delivery-surface-canvas" "The transport and the view it pushes." {
            include *
            autolayout lr
        }

        component marketplace.delivery-run-view "delivery-run-view" "The register module, its state, and its sound." {
            include *
            autolayout lr
        }

        dynamic * "authoring-an-asset" "A file written once and loaded by two hosts." {
            maintainer -> marketplace "Writes the asset, declares both manifests, lists the plugin in marketplace.json, and runs the checks"
            claude-code -> marketplace "Installs plugin@jsdotnet-devbook and loads it"
            copilot -> marketplace "Loads the same files, ignoring the keys it does not know"
        }

        dynamic marketplace "materializing-a-component" "devbook-config running each component's own install in a repository." {
            maintainer -> marketplace.devbook-config "Runs devbook-config:init or update"
            marketplace.devbook-config -> repository "Writes the engine keys of .devbook/config.json"
            marketplace.devbook-config -> marketplace.devbook "Runs devbook:init or update"
            marketplace.devbook -> repository "Copies the payload, runs the outstanding migrations, and writes components.devbook"
            marketplace.devbook-config -> marketplace.devbook-derived "Runs devbook-derived:init or update"
            marketplace.devbook-derived -> repository "Writes the refresh script and workflows and stamps components.derived"
            marketplace.devbook-config -> marketplace.delivery "Runs delivery:init or update"
            marketplace.delivery -> repository "Writes components.delivery"
            marketplace.devbook-config -> marketplace.delivery-schedule "Runs delivery-schedule:init or update"
            marketplace.delivery-schedule -> claude-code "Creates a routine per selected schedule"
        }

        dynamic marketplace "a-flow-run" "One flow-code run in a session, from request to pull request." {
            maintainer -> marketplace.delivery "Asks for a change"
            marketplace.delivery -> marketplace.delivery-surface-dashboard "Starts the run with its stage list"
            marketplace.delivery -> marketplace.devbook "Checks the touched chapters at spec-check"
            maintainer -> marketplace.delivery "Approves at Personal Validation"
            marketplace.delivery -> marketplace.devbook-skills "Writes the pull request description with pr-body"
            marketplace.delivery -> github "Opens the pull request and reports back"
            marketplace.delivery -> marketplace.delivery-surface-dashboard "Finishes the run"
        }
    }
}
