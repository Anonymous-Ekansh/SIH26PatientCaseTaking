from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from .persistence import save_conversation_state
from .state import InterviewState, initial_state
from . import nodes

builder = StateGraph(InterviewState)

builder.add_node("ask_chief_complaint", nodes.ask_chief_complaint)
builder.add_node("classify_complaint", nodes.classify_complaint)
builder.add_node("generate_hpi_question", nodes.generate_hpi_question)
builder.add_node("capture_hpi_answer", nodes.capture_hpi_answer)
builder.add_node("hpi_red_flag_check", nodes.hpi_red_flag_check)
builder.add_node("ask_open_section", nodes.ask_open_section)
builder.add_node("capture_open_section", nodes.capture_open_section)
builder.add_node("final_red_flag_check", nodes.final_red_flag_check)
builder.add_node("emergency_triage", nodes.emergency_triage)

builder.set_entry_point("ask_chief_complaint")
builder.add_edge("ask_chief_complaint", "classify_complaint")
builder.add_edge("classify_complaint", "generate_hpi_question")
builder.add_edge("generate_hpi_question", "capture_hpi_answer")
builder.add_edge("capture_hpi_answer", "hpi_red_flag_check")

# HPI loop: keep asking until the category's field list is exhausted, unless
# a red flag fires first.
builder.add_conditional_edges(
    "hpi_red_flag_check",
    nodes.route_after_hpi_red_flag,
    {
        "emergency": "emergency_triage",
        "continue": "generate_hpi_question",
        "next_section": "ask_open_section",
    },
)

builder.add_edge("ask_open_section", "capture_open_section")

# History-section chain: past_history -> drug_allergy_history -> family_history,
# each a single open-ended question, then on to the final safety check.
builder.add_conditional_edges(
    "capture_open_section",
    nodes.route_after_section,
    {
        "drug_allergy_history": "ask_open_section",
        "family_history": "ask_open_section",
        "final_check": "final_red_flag_check",
    },
)

builder.add_conditional_edges(
    "final_red_flag_check",
    nodes.route_after_final_check,
    {
        "emergency": "emergency_triage",
        "done": END,
    },
)

builder.add_edge("emergency_triage", END)

checkpointer = MemorySaver()
graph = builder.compile(checkpointer=checkpointer)


def _extract_next_step(result: dict) -> dict:
    """Turns LangGraph's raw result into something clean for the FastAPI route to send to the frontend."""
    if "__interrupt__" in result:
        payload = result["__interrupt__"][0].value
        return {"paused": True, **payload}
    return {"paused": False, "final_state": result}


def get_clean_state(result: dict) -> dict:
    """Remove non-serializable LangGraph internals before saving to DB."""
    clean = dict(result)
    clean.pop("__interrupt__", None)
    return clean


def start_interview(encounter_id: str, user_id: str = "test-user", language: str = "en") -> dict:
    config = {"configurable": {"thread_id": encounter_id}}
    result = graph.invoke(initial_state(language=language), config=config)
    step = _extract_next_step(result)
    save_conversation_state(encounter_id, user_id, get_clean_state(result))
    return step


def submit_answer(encounter_id: str, answer: str, user_id: str = "test-user", language: str = "en") -> dict:
    config = {"configurable": {"thread_id": encounter_id}}
    # The language is already in the state, but if we needed to update it we could.
    # For now, it just resumes the graph.
    result = graph.invoke(Command(resume=answer), config=config)
    step = _extract_next_step(result)
    save_conversation_state(encounter_id, user_id, get_clean_state(result))
    return step