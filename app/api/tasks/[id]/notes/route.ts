import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/utils/logger'

// GET /api/tasks/[id]/notes - Get all notes for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user;
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Check if task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user can view this task
    if (user.role === 'EMPLOYEE' && task.assigneeId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get all notes for this task
    const notes = await prisma.taskNote.findMany({
      where: { taskId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ data: notes })
  } catch (error) {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    logError(error, { context: 'GET /api/tasks/[id]/notes', taskId: id })
    return NextResponse.json(
      { error: 'Failed to fetch task notes' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/[id]/notes - Add a new note to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user;
    const { id } = await params
    const body = await request.json()
    const { content } = body

    // Validate required fields
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    // Check if task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user can add notes to this task
    // Admin and Manager can add notes to any task
    // Employees can only add notes to tasks assigned to them
    if (user.role === 'EMPLOYEE' && task.assigneeId !== user.id) {
      return NextResponse.json(
        { error: 'You can only add notes to tasks assigned to you' },
        { status: 403 }
      )
    }

    // Create the note
    const note = await prisma.taskNote.create({
      data: {
        content: content.trim(),
        taskId: id,
        userId: user.id
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: note,
      message: 'Note added successfully'
    })
  } catch (error) {
    logError(error, { context: 'POST /api/tasks/[id]/notes', taskId: id })
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    )
  }
}
