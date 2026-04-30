import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
HTML = (ROOT / "index.html").read_text()
API = (ROOT / "api" / "submit.js").read_text() if (ROOT / "api" / "submit.js").exists() else ""


def test_questionnaire_is_one_question_at_a_time_with_remaining_count():
    assert 'id="question-card"' in HTML
    assert 'id="remaining-count"' in HTML
    assert re.search(r"questions\s*=\s*\[", HTML)
    assert 'showQuestion(' in HTML
    assert 'remaining' in HTML.lower()


def test_next_button_requires_answer_before_advancing():
    assert 'id="next-button"' in HTML
    assert 'Please answer this question before moving forward.' in HTML
    assert re.search(r"if\s*\([^)]*!\s*getCurrentAnswer", HTML) or 'getCurrentAnswer()' in HTML


def test_submit_posts_answers_to_backend_and_never_displays_seed():
    assert "fetch('/api/submit'" in HTML
    assert "https://formsubmit.co/ajax/jasoncfblaze@me.com" in HTML
    assert 'generateSeedForEmail' in HTML
    assert 'seed-preview' not in HTML.lower()
    assert 'downloadSeed' not in HTML
    assert 'copySeed' not in HTML
    assert 'Your answers were sent to Jason' in HTML


def test_backend_generates_seed_and_sends_email_with_maton():
    assert 'MATON_API_KEY' in API
    assert 'gateway.maton.ai/google-mail/gmail/v1/users/me/messages/send' in API
    assert 'generateSeed' in API
    assert 'jasoncfblaze@me.com' in API
    assert 'AutoNovel Seed Submission' in API
