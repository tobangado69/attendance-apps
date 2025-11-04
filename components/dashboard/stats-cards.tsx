"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CheckSquare, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalEmployees: number;
    presentToday: number;
    pendingTasks: number;
    completedTasks: number;
    attendanceRate: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      description: "Active employees",
      color: "text-blue-600",
    },
    {
      title: "Present Today",
      value: stats.presentToday,
      icon: Clock,
      description: "Checked in today",
      color: "text-green-600",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: CheckSquare,
      description: "Tasks to complete",
      color: "text-yellow-600",
    },
    {
      title: "Attendance Rate",
      value: `${stats.attendanceRate}%`,
      icon: TrendingUp,
      description: "This month",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
