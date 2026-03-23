import { useSession } from "next-auth/react";
import type { GetServerSideProps, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LOG_TYPE, UserStatus, USER_STATUS } from "@/types";
import SuggestionModal from "@/components/SuggestionModal";
import SuggestionPrivacyModal from "@/components/SuggestionPrivacyModal";
import UserStats from "@/components/UserStats";
import UserToday from "@/components/UserToday";
import { LogModel } from "@/db/Models";
import connectMongo from "@/lib/connectMongo";
import WelcomeUser from "@/components/WelcomeUser";
import SingleBoxAction from "@/components/SingleBoxAction";
import ThreeBoxAction from "@/components/ThreeBoxAction";
import UserLogsComponent from "@/components/UserLogsComponent";
import getUserByEmail from "@/controllers/getUser";
import styled from "@emotion/styled";

const dateToInputDateValue = (date: Date) =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
    .getDate()
    .toString()
    .padStart(2, "0")}`;

export const getServerSideProps: GetServerSideProps = async (context) => {
  // get session data
  const session = await getServerSession(context.req, context.res, authOptions);

  // if not authenticated redirect to /login
  if (!session?.user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  await connectMongo();

  const user = await getUserByEmail(session.user.email || "foo");
  if (!user.legal) {
    return {
      redirect: {
        destination: "/legal",
        permanent: false,
      },
    };
  }

  let pendingManualTargetDate: string | null = null;
  const lastLog = await LogModel.findOne({ user: session.user.email })
    .sort({ date: -1 })
    .select("type date")
    .exec();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  if (lastLog && lastLog.date < todayStart && lastLog.type !== LOG_TYPE.out) {
    pendingManualTargetDate = dateToInputDateValue(new Date(lastLog.date));
  }

  return {
    props: {
      session,
      pendingManualTargetDate,
    },
  };
};

const Home: NextPage<{ pendingManualTargetDate?: string | null }> = ({
  pendingManualTargetDate,
}) => {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [suggestionPrivacyOpen, setSuggestionPrivacyOpen] = useState(false);

  const getUserStatus = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch("/api/userStatus", { signal });

        if (signal?.aborted || !isMountedRef.current) {
          return;
        }

        if (res.status !== 200) {
          void router.push("/login");
          return;
        }

        const data = await res.json();

        if (signal?.aborted || !isMountedRef.current) {
          return;
        }

        setStatus({
          status: data.status,
          date: new Date(data.date),
          startDate: new Date(data.startDate),
          hoursToday: data.hoursToday,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch user status", error);
      }
    },
    [router],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let currentController: AbortController | null = null;

    const refreshStatus = () => {
      currentController?.abort();
      currentController = new AbortController();
      void getUserStatus(currentController.signal);
    };

    refreshStatus();

    const interval = window.setInterval(refreshStatus, 60 * 1000);

    return () => {
      window.clearInterval(interval);
      currentController?.abort();
    };
  }, [getUserStatus]);

  const { data } = useSession({
    required: true,
  });

  const onCurrentDayLogsUpdated = async () => {
    await getUserStatus();

    if (!isMountedRef.current) {
      return;
    }

    setLogsRefreshKey((previous) => previous + 1);
  };

  useEffect(() => {
    if (!suggestionSent) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuggestionSent(false);
    }, 3500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [suggestionSent]);

  return (
    <>
      <WelcomeUser data={data!} />

      {status &&
        ([USER_STATUS.working, USER_STATUS.paused] as USER_STATUS[]).includes(
          status.status,
        ) && <UserToday onLogsUpdated={onCurrentDayLogsUpdated} />}
      {status &&
        (
          [
            USER_STATUS.not_started,
            USER_STATUS.paused,
            USER_STATUS.finished,
          ] as USER_STATUS[]
        ).includes(status.status) && (
          <SingleBoxAction
            status={status}
            action={LOG_TYPE.in}
            refreshStatus={() => getUserStatus()}
            pendingManualTargetDate={pendingManualTargetDate ?? undefined}
          />
        )}
      {status && status.status === USER_STATUS.working && (
        <ThreeBoxAction refreshStatus={() => getUserStatus()} />
      )}
      {status && (
        <ContentModules>
          <UserStats status={status.status} />
          <UserLogsComponent
            status={status.status}
            refreshKey={logsRefreshKey}
          />
        </ContentModules>
      )}
      <br />
      <br />
      <SuggestionShortcut>
        <SuggestionCopy>
          <SuggestionTitle>Buzón laboral anónimo</SuggestionTitle>
          <SuggestionDescription>
            Canal para enviar sugerencias o quejas sobre la empresa. Se remiten
            de forma anónima.{" "}
            <SuggestionPolicyLink
              type="button"
              onClick={() => setSuggestionPrivacyOpen(true)}
            >
              Política de privacidad de sugerencias
            </SuggestionPolicyLink>
            .
          </SuggestionDescription>
        </SuggestionCopy>
        <SuggestionButton type="button" onClick={() => setSuggestionOpen(true)}>
          Enviar mensaje anónimo
        </SuggestionButton>
      </SuggestionShortcut>
      {suggestionSent && (
        <SuggestionNotice>
          Tu mensaje se ha enviado correctamente de forma anónima.
        </SuggestionNotice>
      )}
      <SuggestionModal
        isOpen={suggestionOpen}
        onClose={() => setSuggestionOpen(false)}
        onSubmitted={() => setSuggestionSent(true)}
        onOpenPrivacyPolicy={() => setSuggestionPrivacyOpen(true)}
      />
      <SuggestionPrivacyModal
        isOpen={suggestionPrivacyOpen}
        onClose={() => setSuggestionPrivacyOpen(false)}
      />
    </>
  );
};

const ContentModules = styled.div`
  width: 614px;
  max-width: 100%;
`;

const SuggestionShortcut = styled.div`
  width: 614px;
  max-width: 100%;
  margin-bottom: 10px;
  padding: 16px 18px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid #eaddec;
  background: linear-gradient(180deg, #fff, #f8f3f9);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const SuggestionCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SuggestionTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #4e4f53;
`;

const SuggestionDescription = styled.div`
  font-size: 13px;
  line-height: 1.5;
  color: #6d6e72;
`;

const SuggestionPolicyLink = styled.button`
  border: none;
  padding: 0;
  background: transparent;
  color: #8a4d92;
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
`;

const SuggestionButton = styled.button`
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 4px;
  background-image: linear-gradient(247deg, #8a4d92, #ff1842);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
`;

const SuggestionNotice = styled.div`
  width: 614px;
  max-width: 100%;
  margin-bottom: 18px;
  font-size: 13px;
  font-weight: 600;
  color: #2e7d32;
`;

export default Home;
