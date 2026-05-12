"""Unit tests for the workspace ``preferences.toml`` round-trip helpers."""

from pathlib import Path

from app.core.preferences import (
    PREFERENCES_FILENAME,
    preferences_to_prompt_section,
    read_preferences,
    write_preferences,
)


def test_read_returns_empty_when_file_missing(tmp_path: Path) -> None:
    """A workspace with no preferences.toml returns an empty dict cleanly."""
    assert read_preferences(tmp_path) == {}


def test_write_then_read_round_trips(tmp_path: Path) -> None:
    """Writing a dict and reading it back yields the same shape."""
    data = {
        "identity": {"name": "Tavi", "role": "founder"},
        "context": {"custom_instructions": "Be terse."},
        "goals": {"items": ["ship demo", "wire allowed_emails"]},
        "channels": {"connected": ["telegram"]},
    }
    write_preferences(tmp_path, data)
    assert (tmp_path / PREFERENCES_FILENAME).exists()
    assert read_preferences(tmp_path) == data


def test_write_strips_none_values(tmp_path: Path) -> None:
    """None values are dropped at write time so the file stays clean."""
    write_preferences(
        tmp_path,
        {
            "identity": {"name": "Tavi", "role": None, "linkedin": None},
            "context": {"custom_instructions": None},
            "goals": {"items": None},
        },
    )
    parsed = read_preferences(tmp_path)
    assert parsed == {"identity": {"name": "Tavi"}}


def test_read_swallows_malformed_toml(tmp_path: Path) -> None:
    """Malformed TOML degrades to {} so the agent still runs."""
    (tmp_path / PREFERENCES_FILENAME).write_text("not = valid = toml", encoding="utf-8")
    assert read_preferences(tmp_path) == {}


def test_prompt_section_returns_none_for_empty_data() -> None:
    """Empty preferences dict yields None so the prompt skips the section."""
    assert preferences_to_prompt_section({}) is None
    assert preferences_to_prompt_section({"identity": {}}) is None


def test_prompt_section_renders_identity_and_goals() -> None:
    """The rendered markdown contains every populated field exactly once."""
    section = preferences_to_prompt_section(
        {
            "identity": {"name": "Tavi", "role": "founder"},
            "context": {"custom_instructions": "Be terse."},
            "goals": {"items": ["ship demo", "wire allowed_emails"]},
        }
    )
    assert section is not None
    assert "## User Preferences" in section
    assert "**Name:** Tavi" in section
    assert "**Role:** founder" in section
    assert "Be terse." in section
    assert "- ship demo" in section
    assert "- wire allowed_emails" in section
