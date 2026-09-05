from app.agent.graph import start_interview
try:
    step = start_interview("test-encounter-3", "test-user")
    print(step)
except Exception as e:
    print(e)
