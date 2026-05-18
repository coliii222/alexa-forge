from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Alexa Forge"
    database_url: str = "sqlite:///./data/forge.db"
    vault_secret: str = "dev-only-change-me"
    cors_origins: str = "http://localhost:3000,http://localhost:8000,*"
    public_host: str = ""
    midtrans_server_key: str = ""
    midtrans_client_key: str = ""
    midtrans_environment: str = "sandbox"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
