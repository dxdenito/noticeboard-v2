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
    cross_origin_cookies: bool = False
    google_client_id: str
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str
    smtp_password: str
    smtp_from_email: str
    frontend_base_url: str


settings = Settings()