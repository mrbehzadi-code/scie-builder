from .mission import load_mission
from .planner import planner
from .runtime import run_cycle
from .state_manager import load_state
from engines.discovery import discover

def run(command):

    mission = load_mission()

    if command=="status":

        print("="*60)
        print("SCIE Builder")
        print("="*60)
        print("Mission :",mission["mission"]["goal"])
        print("Phase   :",mission["phase"]["name"])
        print("Task    :",mission["task"]["current"])
        print("Status  :",mission["status"])
        print("="*60)

    elif command=="planner":
        planner()

    elif command=="discover":
        discover()

    elif command=="state":
        state = load_state()
        print("=" * 60)
        print("Status  :", state["status"])
        print("Phase   :", state["phase"]["name"])
        print("Applied :", state["patches"]["applied"])
        print("Pending :", state["patches"]["pending"])
        print("=" * 60)

    elif command=="continue":
        success = run_cycle()
        if not success:
            raise SystemExit(1)

    else:
        print(f"Unknown command: '{command}'")
        print("Available commands: status, planner, discover, state, continue")
