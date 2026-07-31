from .mission import load_mission
from .planner import planner
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

    elif command=="continue":
        planner()
