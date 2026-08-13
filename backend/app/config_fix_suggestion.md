Suggested changes applied:

1) Use pydantic Field env aliases so environment variables map to the declared fields.

Example patch for backend/app/config.py:

```python
from pydantic import Field
from pydantic import Extra

class Settings(BaseSettings):
	postgres_user: str = Field("fkip_user", env="POSTGRES_USER")
	postgres_password: str = Field("fkip_pass", env="POSTGRES_PASSWORD")
	postgres_db: str = Field("fkip_db", env="POSTGRES_DB")

	# ... other fields ...

	model_config = {
		"env_file": ".env",
		"env_file_encoding": "utf-8",
		"extra": Extra.ignore,
	}
```

2) Confirm the .env keys are POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (uppercase) or change their names accordingly.

3) Run tests again. If ValidationError persists, print `Settings.model_fields` and report pydantic / pydantic-settings versions.