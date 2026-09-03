from .mission import load_mission
from .planner import planner
from .runtime import run_cycle
from .state_manager import load_state
from .dashboard import dashboard
from engines.discovery import discover
from engines.academic import discover_academics
from engines.entity_resolution import main as entity_resolution_main


def run(command):
    mission = load_mission()

    if command == "status":
        print("=" * 60)
        print("SCIE Builder")
        print("=" * 60)
        print("Mission :", mission["mission"]["goal"])
        print("Phase   :", mission["phase"]["name"])
        print("Task    :", mission["task"]["current"])
        print("Status  :", mission["status"])
        print("=" * 60)

    elif command == "dashboard":
        dashboard()

    elif command == "planner":
        planner()

    elif command == "discover":
        discover()

    elif command == "discover-academics":
        discover_academics()

    elif command == "entity-resolution":
        entity_resolution_main()

    elif command == "state":
        state = load_state()
        print("=" * 60)
        print("Status  :", state["status"])
        print("Phase   :", state["phase"]["name"])
        print("Applied :", state["patches"]["applied"])
        print("Pending :", state["patches"]["pending"])
        print("=" * 60)

    elif command == "continue":
        success = run_cycle()
        if not success:
            raise SystemExit(1)

    else:
        print(f"Unknown command: '{command}'")
        print("Available commands: status, dashboard, planner, discover, discover-academics, entity-resolution, state, continue")
