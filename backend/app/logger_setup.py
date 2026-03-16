# logger_setup.py
import logging
import sys


def configure_logging():
    """Sets up the global logging configuration."""

    # We configure the root logger so that all module-level loggers inherit these settings
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    # 1. Console Handler (for terminal output)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter("%(levelname)s - %(name)s - %(message)s")
    console_handler.setFormatter(console_format)

    # 2. File Handler (for saving logs to a file)
    file_handler = logging.FileHandler("app.log")
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )
    file_handler.setFormatter(file_format)

    # Prevent adding handlers multiple times if configure_logging is called twice
    if not root_logger.handlers:
        root_logger.addHandler(console_handler)
        root_logger.addHandler(file_handler)
