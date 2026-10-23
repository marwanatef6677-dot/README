import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { arSA } from "@clerk/localizations";
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import type { Profile } from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/shell";
import { ErrorState, Skeleton } from "@/components/bits";
import { useProfile } from "@/hooks/use-pablo";
import { errorText } from "@/lib/pablo";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Book from "@/pages/book";
import Trips from "@/pages/trips";
import TripDetail from "@/pages/trip-detail";
import Account from "@/pages/account";
import { SignInPage, SignUpPage } from "@/pages/auth";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 2000 } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#10151d",
    colorForeground: "#10151d",
    colorMutedForeground: "#525c6b",
    colorDanger: "#c8322a",
    colorBackground: "#fbf8f0",
    colorInput: "#ffffff",
    colorInputForeground: "#10151d",
    colorNeutral: "#10151d",
    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
    borderRadius: "0.9rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fbf8f0] rounded-[1.75rem] w-[440px] max-w-full overflow-hidden border border-[#10151d]/10 shadow-[0_20px_60px_-25px_rgba(16,21,29,.35)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-['Alexandria'] text-2xl font-black text-[#10151d]",
    headerSubtitle: "text-[#525c6b]",
    socialButtonsBlockButtonText: "text-[#10151d] font-semibold",
    formFieldLabel: "text-[#10151d] font-semibold",
    footerActionLink: "text-[#10151d] font-bold underline decoration-[#ffd000] decoration-2 underline-offset-4",
    footerActionText: "text-[#525c6b]",
    dividerText: "text-[#525c6b]",
    identityPreviewEditButton: "text-[#10151d]",
    formFieldSuccessText: "text-[#1f7a5f]",
    alertText: "text-[#10151d]",
    logoBox: "h-14 justify-center",
    logoImage: "h-14 w-14",
    socialButtonsBlockButton: "border border-[#10151d]/15 bg-white rounded-xl h-11",
    formButtonPrimary: "bg-[#ffd000] text-[#10151d] font-['Alexandria'] font-bold rounded-xl h-11 shadow-[0_4px_0_#10151d] normal-case",
    formFieldInput: "rounded-xl h-11 border-[#10151d]/15 bg-white text-[#10151d]",
    footerAction: "justify-center",
    dividerLine: "bg-[#10151d]/10",
    alert: "rounded-xl border-[#c8322a]/30 bg-[#c8322a]/5",
    otpCodeFieldInput: "border-[#10151d]/25 rounded-lg",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

const localization = {
  ...arSA,
  signIn: { ...arSA.signIn, start: { ...arSA.signIn?.start, title: "ادخل على بابلو", subtitle: "كمّل من مكان ما وقفت" } },
  signUp: { ...arSA.signUp, start: { ...arSA.signUp?.start, title: "حساب جديد في بابلو", subtitle: "دقيقة واحدة وتطلب أول مشوار" } },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) qc.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function PageSkeleton() {
  return <div className="mx-auto max-w-4xl space-y-4 px-4 py-8"><Skeleton className="h-10 w-64" /><Skeleton className="h-72 rounded-[2rem]" /><Skeleton className="h-24" /></div>;
}

function WithProfile({ page: Page, allowOnboarding }: { page: ComponentType<{ profile: Profile }>; allowOnboarding?: boolean }) {
  const profile = useProfile();
  if (profile.isLoading) return <PageSkeleton />;
  if (profile.isError || !profile.data) return <div className="mx-auto max-w-xl px-4 py-12"><ErrorState message={errorText(profile.error, "مش قادرين نجيب حسابك.")} onRetry={() => profile.refetch()} /></div>;
  if (!profile.data.onboarded && !allowOnboarding) return <Redirect to="/account" />;
  return <Page profile={profile.data} />;
}

function Protected(props: { page: ComponentType<{ profile: Profile }>; allowOnboarding?: boolean }) {
  return (
    <>
      <Show when="signed-in"><WithProfile {...props} /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/book" /></Show>
      <Show when="signed-out"><Home /></Show>
    </>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Routes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <Shell>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/book">{() => <Protected page={Book} />}</Route>
              <Route path="/trips">{() => <Protected page={Trips} />}</Route>
              <Route path="/trips/:id">{() => <Protected page={TripDetail} />}</Route>
              <Route path="/account">{() => <Protected page={Account} allowOnboarding />}</Route>
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </Shell>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={localization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Routes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
