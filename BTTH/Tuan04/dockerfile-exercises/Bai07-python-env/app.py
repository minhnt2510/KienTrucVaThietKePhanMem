import os

app_env = os.getenv("APP_ENV", "unknown")
print(f"APP_ENV={app_env}")
