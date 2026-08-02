"""
Runtime
-------
This is the module `python builder.py continue` actually calls.

It is the first real (not conceptual) Execution Agent cycle:

    Load State
        -> Pick next pending Patch
            -> Apply Patch
                -> Update State
                    -> Report result

This module deliberately does ONE patch per run. Doing many patches per
run is a future Sprint (the Autonomous Development Loop) -- Sprint 003's
only job is to prove this cycle works end-to-end without error.
"""

from core.state_manager import load_state, save_state, record_event
from core.patch_manager import load_patch, apply_patch, list_pending, PatchError


def run_cycle():
    print()
    print("SCIE Runtime")
    print("-" * 50)

    state = load_state()
    pending = list_pending(state)

    if not pending:
        print("No pending patches.")
        print(f"Applied so far: {len(state['patches']['applied'])}")
        print("Nothing to do. Runtime exiting cleanly.")
        print("-" * 50)
        return True

    patch_id = pending[0]
    print(f"Next patch : {patch_id}")

    try:
        patch = load_patch(patch_id)
    except PatchError as e:
        print(f"FAILED to load patch: {e}")
        state = record_event(state, "load_failed", patch_id, str(e))
        state["status"] = "ERROR"
        save_state(state)
        print("-" * 50)
        return False

    print(f"Description: {patch['description']}")

    success, message = apply_patch(patch)
    print(f"Result     : {'OK' if success else 'FAILED'} - {message}")

    if success:
        state["patches"]["pending"].remove(patch_id)
        state["patches"]["applied"].append(patch_id)
        state = record_event(state, "applied", patch_id, message)
        state["status"] = "READY"
        state["task"]["current"] = f"Applied {patch_id}"
    else:
        state = record_event(state, "failed", patch_id, message)
        state["status"] = "ERROR"

    save_state(state)

    print(f"State saved. Status: {state['status']}")
    print("-" * 50)

    return success
