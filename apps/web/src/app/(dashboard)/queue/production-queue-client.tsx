"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ProductionQueuePage,
} from "@repo/ui";
import type {
  ProductionQueuePageData,
} from "@repo/ui";
import {
  getQueueData,
  takeJobAction,
  pauseJobAction,
  completeJobAction,
  getJobDetailAction,
} from "@/app/actions/queue";
import type { QueueDetail } from "@/app/actions/queue";

const POLL_INTERVAL_MS = 30_000;

function ProductionQueueClient() {
  const [data, setData] = useState<ProductionQueuePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch data ── */
  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const result = await getQueueData();
      setData({
        jobs: result.jobs,
        stations: result.stations,
        machines: result.machines,
        operations: result.operations,
        activeWork: result.activeWork,
        summary: result.summary,
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load queue data.");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  /* ── Initial load + polling ── */
  useEffect(() => {
    fetchData(true);

    pollRef.current = setInterval(() => {
      fetchData(false);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [fetchData]);

  /* ── Actions ── */
  const handleTakeJob = useCallback(
    async (id: string) => {
      await takeJobAction(id);
      await fetchData(false);
    },
    [fetchData]
  );

  const handlePauseJob = useCallback(
    async (id: string) => {
      await pauseJobAction(id);
      await fetchData(false);
    },
    [fetchData]
  );

  const handleCompleteJob = useCallback(
    async (id: string) => {
      await completeJobAction(id);
      await fetchData(false);
    },
    [fetchData]
  );

  const handleGetDetail = useCallback(
    async (id: string): Promise<QueueDetail | null> => {
      return getJobDetailAction(id);
    },
    []
  );

  const handleRefresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  return (
    <ProductionQueuePage
      data={
        data ?? {
          jobs: [],
          stations: [],
          machines: [],
          operations: [],
          activeWork: null,
          summary: { waitingJobs: 0, runningJobs: 0, completedToday: 0, avgQueueTimeMinutes: 0 },
        }
      }
      loading={loading && !data}
      error={error}
      onRefresh={handleRefresh}
      onTakeJob={handleTakeJob}
      onPauseJob={handlePauseJob}
      onCompleteJob={handleCompleteJob}
      onGetDetail={handleGetDetail}
    />
  );
}

export { ProductionQueueClient };
