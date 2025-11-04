"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { SessionProp } from "@/lib/types/session";

interface TaskNote {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TaskNotesProps {
  taskId: string;
  session?: SessionProp;
}

export function TaskNotes({ taskId, session }: TaskNotesProps) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Check if user can add notes
  const canAddNotes = () => {
    return (
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "MANAGER" ||
      session?.user?.role === "EMPLOYEE"
    );
  };

  // Fetch notes for the task
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/notes`);
      const data = await response.json();

      if (response.ok) {
        setNotes(data.data || []);
      } else {
        console.error("Failed to fetch notes:", data.error);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new note
  const handleAddNote = async () => {
    if (!newNote.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/tasks/${taskId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newNote.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotes([data.data, ...notes]);
        setNewNote("");
      } else {
        console.error("Failed to add note:", data.error);
        alert(data.error || "Failed to add note");
      }
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  // Load notes on component mount
  useEffect(() => {
    if (taskId) {
      fetchNotes();
    }
  }, [taskId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Task Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading notes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Task Notes ({notes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new note form */}
        {canAddNotes() && (
          <div className="space-y-3">
            <Textarea
              placeholder="Add a note about this task..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px]"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || submitting}
                size="sm"
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notes yet. Be the first to add one!</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-sm">
                      {note.user.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {note.user.email}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {format(
                      new Date(note.createdAt),
                      "MMM dd, yyyy 'at' HH:mm"
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
