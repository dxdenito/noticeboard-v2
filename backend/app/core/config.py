from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    app_name: str = "Noticeboard"
    debug: bool = False
    model_config = {"env_file": ".env"}
    UPLOAD_DIR: str = "uploads"


settings = Settings()