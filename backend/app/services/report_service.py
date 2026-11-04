import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.story import UserStory
from app.models.task import Task


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def generate_project_report(self, project_id: int, format_type: str = "json") -> Dict[str, Any]:
        """
        Compiles an extensive summary report for the project.
        Returns a dict containing metrics, story/task details, and pre-formatted CSV/JSON content.
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with ID {project_id} not found")

        stories = (
            self.db.query(UserStory)
            .filter(UserStory.project_id == project_id)
            .order_by(UserStory.position.asc())
            .all()
        )

        tasks = (
            self.db.query(Task)
            .join(UserStory, Task.story_id == UserStory.id)
            .filter(UserStory.project_id == project_id)
            .order_by(Task.position.asc())
            .all()
        )

        total_stories = len(stories)
        total_tasks = len(tasks)
        done_tasks = sum(1 for t in tasks if t.status == "Done")
        progress_pct = round((done_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

        story_summary = []
        for s in stories:
            s_tasks = [t for t in tasks if t.story_id == s.id]
            s_done = sum(1 for t in s_tasks if t.status == "Done")
            s_pct = (
                round((s_done / len(s_tasks) * 100), 1)
                if s_tasks
                else (100.0 if s.status == "Done" else 0.0)
            )
            story_summary.append(
                {
                    "id": s.id,
                    "title": s.title,
                    "status": s.status,
                    "priority": s.priority,
                    "story_points": s.story_points,
                    "assignee": s.assignee.full_name if s.assignee else "Unassigned",
                    "tasks_count": len(s_tasks),
                    "tasks_done": s_done,
                    "progress_pct": s_pct,
                }
            )

        task_summary = []
        for t in tasks:
            task_summary.append(
                {
                    "id": t.id,
                    "story_id": t.story_id,
                    "story_title": t.story.title if t.story else "",
                    "title": t.title,
                    "status": t.status,
                    "priority": t.priority,
                    "assignee": t.assignee.full_name if t.assignee else "Unassigned",
                    "estimate_hours": t.estimate_hours,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                }
            )

        # Generate CSV representation
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Project Report", project.name, f"({project.key})"])
        writer.writerow(["Generated At", datetime.now(timezone.utc).isoformat()])
        writer.writerow(["Overall Progress", f"{progress_pct}%"])
        writer.writerow([])
        writer.writerow(["--- USER STORIES ---"])
        writer.writerow(
            [
                "ID",
                "Title",
                "Status",
                "Priority",
                "Points",
                "Assignee",
                "Tasks Total",
                "Tasks Done",
                "Progress %",
            ]
        )
        for s in story_summary:
            writer.writerow(
                [
                    s["id"],
                    s["title"],
                    s["status"],
                    s["priority"],
                    s["story_points"] or 0,
                    s["assignee"],
                    s["tasks_count"],
                    s["tasks_done"],
                    f"{s['progress_pct']}%",
                ]
            )
        writer.writerow([])
        writer.writerow(["--- TASKS ---"])
        writer.writerow(
            [
                "Task ID",
                "Story ID",
                "Story Title",
                "Task Title",
                "Status",
                "Priority",
                "Assignee",
                "Estimate (h)",
                "Due Date",
            ]
        )
        for t in task_summary:
            writer.writerow(
                [
                    t["id"],
                    t["story_id"],
                    t["story_title"],
                    t["title"],
                    t["status"],
                    t["priority"],
                    t["assignee"],
                    t["estimate_hours"] or "",
                    t["due_date"] or "",
                ]
            )

        csv_content = output.getvalue()

        report_data = {
            "project_id": project.id,
            "project_name": project.name,
            "project_key": project.key,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_stories": total_stories,
            "total_tasks": total_tasks,
            "progress_pct": progress_pct,
            "stories": story_summary,
            "tasks": task_summary,
            "format": format_type,
            "csv_content": csv_content,
        }

        return report_data
