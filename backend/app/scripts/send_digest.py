import argparse
import asyncio

from app.core.database import AsyncSessionLocal
from app.services.digest_service import (
    Busy, DigestService, NothingToSend, execute_run, run_schedule_check,
)


async def main(now: bool) -> None:
    if not now:
        run_id = await run_schedule_check()
        print(f"Digest run {run_id} finished" if run_id else "Nothing to send right now")
        return

    async with AsyncSessionLocal() as db:
        try:
            run_id = await DigestService(db).start_system_digest()
        except Busy:
            print("A digest is already being sent")
            return
        except NothingToSend as exc:
            print(str(exc))
            return
    await execute_run(run_id)
    print(f"Digest run {run_id} finished")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--now", action="store_true")
    arguments = parser.parse_args()
    asyncio.run(main(arguments.now))