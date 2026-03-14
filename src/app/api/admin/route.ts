import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // --- Users ---
    const [totalUsers, usersToday, usersThisWeek, usersThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    ]);

    // Active users (have a session that hasn't expired)
    const [activeLast7d, activeLast30d] = await Promise.all([
      prisma.session.findMany({
        where: { expires: { gte: now } },
        distinct: ["userId"],
        select: { userId: true },
      }).then(s => s.length),
      prisma.session.count({
        where: { expires: { gte: monthAgo } },
      }),
    ]);

    // Recent signups
    const recentSignups = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        accounts: { select: { provider: true } },
        _count: { select: { userPortals: true } },
      },
    });

    // --- Portals ---
    const totalPortals = await prisma.portal.count();
    const portalsByTier = await prisma.portal.groupBy({
      by: ["planTier"],
      _count: true,
    });

    // Portals with user info
    const portalsList = await prisma.portal.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        hubspotPortalId: true,
        planTier: true,
        syncStatus: true,
        lastSyncedAt: true,
        createdAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        _count: {
          select: { workflows: true, userPortals: true },
        },
      },
    });

    // --- Workflows ---
    const totalWorkflows = await prisma.workflow.count();
    const workflowsByStatus = await prisma.workflow.groupBy({
      by: ["status"],
      _count: true,
    });
    const workflowsByObjectType = await prisma.workflow.groupBy({
      by: ["objectType"],
      _count: true,
    });

    // --- Syncs ---
    const [totalSyncs, syncsFailed, syncsCompleted, syncsThisWeek] = await Promise.all([
      prisma.syncLog.count(),
      prisma.syncLog.count({ where: { status: "FAILED" } }),
      prisma.syncLog.count({ where: { status: "COMPLETED" } }),
      prisma.syncLog.count({ where: { startedAt: { gte: weekAgo } } }),
    ]);

    // Sync history (last 30 days, grouped by day)
    const syncLogs = await prisma.syncLog.findMany({
      where: { startedAt: { gte: monthAgo } },
      select: { status: true, startedAt: true, durationMs: true },
      orderBy: { startedAt: "asc" },
    });

    const syncByDay: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const log of syncLogs) {
      const day = log.startedAt.toISOString().split("T")[0];
      if (!syncByDay[day]) syncByDay[day] = { total: 0, completed: 0, failed: 0 };
      syncByDay[day].total++;
      if (log.status === "COMPLETED") syncByDay[day].completed++;
      if (log.status === "FAILED") syncByDay[day].failed++;
    }
    const syncTimeline = Object.entries(syncByDay).map(([date, data]) => ({ date, ...data }));

    // Average sync duration
    const completedSyncs = syncLogs.filter(s => s.durationMs && s.status === "COMPLETED");
    const avgSyncDuration = completedSyncs.length > 0
      ? Math.round(completedSyncs.reduce((sum, s) => sum + (s.durationMs || 0), 0) / completedSyncs.length)
      : 0;

    // --- AI Usage ---
    let aiEvents: any[] = [];
    let aiTotal = 0;
    let aiThisWeek = 0;
    let aiToday = 0;
    let aiByDay: any[] = [];
    try {
      [aiTotal, aiThisWeek, aiToday] = await Promise.all([
        prisma.analyticsEvent.count({ where: { event: "ai_analysis" } }),
        prisma.analyticsEvent.count({ where: { event: "ai_analysis", createdAt: { gte: weekAgo } } }),
        prisma.analyticsEvent.count({ where: { event: "ai_analysis", createdAt: { gte: today } } }),
      ]);

      aiEvents = await prisma.analyticsEvent.findMany({
        where: { event: "ai_analysis", createdAt: { gte: monthAgo } },
        select: { createdAt: true, portalId: true, userId: true },
        orderBy: { createdAt: "asc" },
      });

      const aiDayMap: Record<string, number> = {};
      for (const e of aiEvents) {
        const day = e.createdAt.toISOString().split("T")[0];
        aiDayMap[day] = (aiDayMap[day] || 0) + 1;
      }
      aiByDay = Object.entries(aiDayMap).map(([date, count]) => ({ date, count }));
    } catch {
      // Table might not exist yet
    }

    // --- Revenue (from Stripe data on portals) ---
    const paidPortals = await prisma.portal.findMany({
      where: { stripeSubscriptionId: { not: null } },
      select: { planTier: true, stripeCurrentPeriodEnd: true },
    });

    const tierPrices: Record<string, number> = {
      STARTER: 9,
      GROWTH: 19,
      PRO: 29,
      ENTERPRISE: 99,
    };

    const mrr = paidPortals.reduce((sum, p) => sum + (tierPrices[p.planTier] || 0), 0);
    const activeSubs = paidPortals.filter(p =>
      p.stripeCurrentPeriodEnd && new Date(p.stripeCurrentPeriodEnd) > now
    ).length;

    // --- Signup timeline (last 30 days) ---
    const signupsByDay: Record<string, number> = {};
    const allRecentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: monthAgo } },
      select: { createdAt: true },
    });
    for (const u of allRecentUsers) {
      const day = u.createdAt.toISOString().split("T")[0];
      signupsByDay[day] = (signupsByDay[day] || 0) + 1;
    }
    const signupTimeline = Object.entries(signupsByDay).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      users: {
        total: totalUsers,
        today: usersToday,
        thisWeek: usersThisWeek,
        thisMonth: usersThisMonth,
        activeLast7d,
        activeLast30d,
        signupTimeline,
        recentSignups: recentSignups.map(u => ({
          ...u,
          providers: u.accounts.map(a => a.provider),
          portalCount: u._count.userPortals,
        })),
      },
      portals: {
        total: totalPortals,
        byTier: portalsByTier.map(t => ({ tier: t.planTier, count: t._count })),
        list: portalsList.map(p => ({
          ...p,
          workflowCount: p._count.workflows,
          userCount: p._count.userPortals,
        })),
      },
      workflows: {
        total: totalWorkflows,
        byStatus: workflowsByStatus.map(s => ({ status: s.status, count: s._count })),
        byObjectType: workflowsByObjectType.map(t => ({ type: t.objectType, count: t._count })),
      },
      syncs: {
        total: totalSyncs,
        completed: syncsCompleted,
        failed: syncsFailed,
        successRate: totalSyncs > 0 ? Math.round((syncsCompleted / totalSyncs) * 100) : 0,
        thisWeek: syncsThisWeek,
        avgDurationMs: avgSyncDuration,
        timeline: syncTimeline,
      },
      ai: {
        total: aiTotal,
        thisWeek: aiThisWeek,
        today: aiToday,
        timeline: aiByDay,
      },
      revenue: {
        mrr,
        activeSubs,
        paidPortals: paidPortals.length,
      },
    });
  } catch (err) {
    console.error("[Admin] Error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
