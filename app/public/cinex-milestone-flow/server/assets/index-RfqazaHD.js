import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from "react";
import { isConnected, getLocalStorage, connect, disconnect, request, openContractCall } from "@stacks/connect";
import { STACKS_TESTNET } from "@stacks/network";
import { listCV, tupleCV, uintCV, stringAsciiCV, fetchCallReadOnlyFunction, cvToJSON, standardPrincipalCV, bufferCV, Pc } from "@stacks/transactions";
function useWallet() {
  const [state, setState] = useState({ connected: false, address: null });
  const refresh = useCallback(() => {
    if (isConnected()) {
      const data = getLocalStorage();
      const stxAddr = data?.addresses?.stx?.[0]?.address ?? null;
      setState({ connected: !!stxAddr, address: stxAddr });
    } else {
      setState({ connected: false, address: null });
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const connectWallet = useCallback(async () => {
    try {
      await connect();
      refresh();
    } catch (e) {
      console.error("connect failed", e);
    }
  }, [refresh]);
  const disconnectWallet = useCallback(() => {
    disconnect();
    setState({ connected: false, address: null });
  }, []);
  return { ...state, connect: connectWallet, disconnect: disconnectWallet, request };
}
const NETWORK = STACKS_TESTNET;
const CONTRACT_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const VERIFICATION_CONTRACT = "project-verification-module";
const ESCROW_CONTRACT = "milestone-escrow";
const explorerTxUrl = (txId) => `https://explorer.stacks.co/txid/${txId.startsWith("0x") ? txId : "0x" + txId}?chain=testnet`;
const milestonesToCV = (milestones) => listCV(
  milestones.map(
    (m) => tupleCV({
      name: stringAsciiCV(m.name),
      amount: uintCV(BigInt(m.amount || "0"))
    })
  )
);
async function readCampaign(campaignId, senderAddress) {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: ESCROW_CONTRACT,
      functionName: "get-campaign",
      functionArgs: [uintCV(BigInt(campaignId || "0"))],
      network: NETWORK,
      senderAddress
    });
    return cvToJSON(result);
  } catch (e) {
    console.error("readCampaign failed", e);
    return null;
  }
}
const initialTx = { status: "idle" };
function StatusBadge({ tx }) {
  if (tx.status === "idle") return null;
  const colors = {
    idle: "",
    broadcasting: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    pending: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    confirmed: "bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/40",
    error: "bg-red-500/15 text-red-300 border-red-500/30"
  };
  return /* @__PURE__ */ jsxs("div", { className: `mt-3 rounded-lg border px-3 py-2 text-xs ${colors[tx.status]}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "font-mono uppercase tracking-wider", children: tx.status }),
      tx.txId && /* @__PURE__ */ jsx(
        "a",
        {
          href: explorerTxUrl(tx.txId),
          target: "_blank",
          rel: "noreferrer",
          className: "underline hover:no-underline truncate max-w-[60%]",
          children: "View on Explorer ↗"
        }
      )
    ] }),
    tx.error && /* @__PURE__ */ jsx("div", { className: "mt-1 text-red-300/90", children: tx.error })
  ] });
}
function StepCard({
  index,
  title,
  description,
  children,
  done
}) {
  return /* @__PURE__ */ jsx("section", { className: "glass rounded-2xl p-6 shadow-2xl", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: `flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-bold ${done ? "border-[#4ade80] bg-[#4ade80]/20 text-[#4ade80]" : "border-white/15 bg-white/5 text-white/70"}`,
        children: done ? "✓" : index
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-white", children: title }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-white/60", children: description }),
      /* @__PURE__ */ jsx("div", { className: "mt-4 space-y-3", children })
    ] })
  ] }) });
}
function Field({
  label,
  ...props
}) {
  return /* @__PURE__ */ jsxs("label", { className: "block", children: [
    /* @__PURE__ */ jsx("span", { className: "mb-1 block text-xs font-medium uppercase tracking-wider text-white/50", children: label }),
    /* @__PURE__ */ jsx(
      "input",
      {
        ...props,
        className: "input-dark w-full rounded-lg px-3 py-2 text-sm font-mono"
      }
    )
  ] });
}
function CineXDemo() {
  const wallet = useWallet();
  const [campaignState, setCampaignState] = useState(null);
  const [loadingState, setLoadingState] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [vertical, setVertical] = useState("");
  const [tx1, setTx1] = useState(initialTx);
  const [campaignId, setCampaignId] = useState("1");
  const [goal, setGoal] = useState("1000000");
  const [milestones, setMilestones] = useState([
    { name: "Pre-production", amount: "400000" },
    { name: "Production", amount: "600000" }
  ]);
  const [tx2, setTx2] = useState(initialTx);
  const [depositCampaignId, setDepositCampaignId] = useState("1");
  const [depositAmount, setDepositAmount] = useState("500000");
  const [tx3, setTx3] = useState(initialTx);
  const [approveCampaignId, setApproveCampaignId] = useState("1");
  const [approveIndex, setApproveIndex] = useState("0");
  const [tx4, setTx4] = useState(initialTx);
  const [releaseCampaignId, setReleaseCampaignId] = useState("1");
  const [releaseIndex, setReleaseIndex] = useState("0");
  const [tx5, setTx5] = useState(initialTx);
  async function callContract(setTx, contractName, functionName, functionArgs, postConditions = [], postConditionMode = "deny", onDone) {
    if (!wallet.connected) {
      setTx({ status: "error", error: "Connect your wallet first." });
      return;
    }
    console.log("callContract called with:", {
      contractName,
      functionName,
      fullContractId: `${CONTRACT_ADDRESS}.${contractName}`,
      functionArgs,
      postConditions
    });
    setTx({ status: "broadcasting" });
    try {
      const res = await request("stx_callContract", {
        contract: `${CONTRACT_ADDRESS}.${contractName}`,
        functionName,
        functionArgs,
        network: "testnet",
        postConditions,
        postConditionMode
      });
      const txId = res.txid;
      if (txId) {
        setTx({ status: "pending", txId });
        setTimeout(() => setTx({ status: "confirmed", txId }), 4e3);
        onDone?.();
      } else {
        setTx({ status: "confirmed" });
        onDone?.();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTx({ status: "error", error: msg });
    }
  }
  async function handleRegister() {
    alert("Register Creator button clicked!");
    console.log("handleRegister triggered, wallet.address:", wallet.address);
    if (!wallet.address) {
      console.error("No wallet address");
      alert("Please connect your wallet first.");
      return;
    }
    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: VERIFICATION_CONTRACT,
        functionName: "register-creator",
        functionArgs: [
          standardPrincipalCV(wallet.address),
          stringAsciiCV(creatorName),
          stringAsciiCV("https://cinex.africa/creator"),
          bufferCV(new Uint8Array(32)),
          stringAsciiCV(vertical),
          uintCV(1n),
          uintCV(100000n)
        ],
        network: "testnet",
        onFinish: (data) => {
          console.log("Transaction successful", data);
          setTx1({ status: "confirmed", txId: data.txId });
        },
        onCancel: () => {
          console.log("Transaction cancelled");
          setTx1({ status: "idle" });
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("openContractCall error:", errorMessage);
      setTx1({ status: "error", error: errorMessage });
    }
  }
  async function handleCreateCampaign() {
    if (!wallet.address) {
      alert("Connect wallet first");
      return;
    }
    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: ESCROW_CONTRACT,
        functionName: "create-campaign",
        functionArgs: [
          uintCV(BigInt(campaignId || "0")),
          standardPrincipalCV(wallet.address),
          // temporary asset principal
          uintCV(BigInt(goal || "0")),
          milestonesToCV(milestones),
          uintCV(500000n)
        ],
        network: "testnet",
        onFinish: (data) => {
          console.log("create-campaign success", data);
          setTx2({ status: "confirmed", txId: data.txId });
          refreshCampaign(campaignId);
        },
        onCancel: () => {
          setTx2({ status: "idle" });
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(errorMessage);
      setTx2({ status: "error", error: errorMessage });
    }
  }
  async function handleDeposit() {
    if (!wallet.address) return;
    const amount = BigInt(depositAmount || "0");
    const pc = Pc.principal(wallet.address).willSendEq(amount).ustx();
    await callContract(
      setTx3,
      ESCROW_CONTRACT,
      "deposit",
      [uintCV(BigInt(depositCampaignId || "0")), uintCV(amount)],
      [pc],
      "deny",
      () => refreshCampaign(depositCampaignId)
    );
  }
  async function handleApprove() {
    await callContract(
      setTx4,
      ESCROW_CONTRACT,
      "approve-milestone",
      [uintCV(BigInt(approveCampaignId || "0")), uintCV(BigInt(approveIndex || "0"))],
      [],
      "allow",
      () => refreshCampaign(approveCampaignId)
    );
  }
  async function handleRelease() {
    await callContract(
      setTx5,
      ESCROW_CONTRACT,
      "release-milestone-funds",
      [uintCV(BigInt(releaseCampaignId || "0")), uintCV(BigInt(releaseIndex || "0"))],
      [],
      "allow",
      () => refreshCampaign(releaseCampaignId)
    );
  }
  async function refreshCampaign(id) {
    if (!wallet.address) return;
    setLoadingState(true);
    const data = await readCampaign(id, wallet.address);
    setCampaignState(data);
    setLoadingState(false);
  }
  function updateMilestone(i, field, value) {
    setMilestones((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen text-white", children: [
    /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-10 glass-strong", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-lg neon-border flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "neon-text text-lg font-black", children: "C" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("h1", { className: "text-base font-bold leading-none", children: [
            "Cine",
            /* @__PURE__ */ jsx("span", { className: "neon-text", children: "X" }),
            " Demo"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-[0.2em] text-white/40", children: "Milestone-Based Financing · Stacks Testnet" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center gap-3", children: wallet.connected ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("span", { className: "hidden sm:inline rounded-full border border-[#4ade80]/40 bg-[#4ade80]/10 px-3 py-1 text-xs font-mono text-[#4ade80]", children: [
          wallet.address?.slice(0, 6),
          "…",
          wallet.address?.slice(-4)
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: wallet.disconnect,
            className: "rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5",
            children: "Disconnect"
          }
        )
      ] }) : /* @__PURE__ */ jsx("button", { onClick: wallet.connect, className: "neon-btn rounded-lg px-4 py-2 text-sm font-semibold", children: "Connect Wallet" }) })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-6xl px-6 py-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-10", children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-4xl font-black tracking-tight sm:text-5xl", children: [
          "Fund films, ",
          /* @__PURE__ */ jsx("span", { className: "neon-text", children: "milestone by milestone" }),
          "."
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-2xl text-white/60", children: "A guided walkthrough of CineX's on-chain financing flow — register a creator, launch a campaign, back it, approve milestones, and release funds. All on Stacks testnet." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-xl glass border border-[#4ade80]/20 p-4 text-sm text-white/70", children: [
          /* @__PURE__ */ jsx("span", { className: "neon-text font-semibold", children: "Note:" }),
          " Uses testnet STX – free and worthless. Get testnet STX from the",
          " ",
          /* @__PURE__ */ jsx(
            "a",
            {
              className: "underline hover:text-[#4ade80]",
              href: "https://explorer.hiro.so/sandbox/faucet?chain=testnet",
              target: "_blank",
              rel: "noreferrer",
              children: "Hiro faucet"
            }
          ),
          "."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-[1fr_360px]", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
          /* @__PURE__ */ jsxs(
            StepCard,
            {
              index: 1,
              title: "Register creator",
              description: "Identify yourself in the verification module before launching.",
              done: tx1.status === "confirmed",
              children: [
                /* @__PURE__ */ jsx(
                  Field,
                  {
                    label: "Name",
                    placeholder: "Jane Director",
                    value: creatorName,
                    onChange: (e) => setCreatorName(e.target.value)
                  }
                ),
                /* @__PURE__ */ jsx(
                  Field,
                  {
                    label: "Vertical",
                    placeholder: "film, series, docu…",
                    value: vertical,
                    onChange: (e) => setVertical(e.target.value)
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    disabled: !wallet.connected || !creatorName || !vertical || tx1.status === "broadcasting",
                    onClick: handleRegister,
                    className: "neon-btn rounded-lg px-4 py-2 text-sm font-semibold",
                    children: "Register Creator"
                  }
                ),
                /* @__PURE__ */ jsx(StatusBadge, { tx: tx1 })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            StepCard,
            {
              index: 2,
              title: "Create campaign",
              description: "Define milestones and a total funding goal.",
              done: tx2.status === "confirmed",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ jsx(
                    Field,
                    {
                      label: "Campaign ID",
                      value: campaignId,
                      onChange: (e) => setCampaignId(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Field,
                    {
                      label: "Goal (µSTX)",
                      value: goal,
                      onChange: (e) => setGoal(e.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-xs font-medium uppercase tracking-wider text-white/50", children: "Milestones" }),
                    /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => setMilestones((m) => [...m, { name: "", amount: "0" }]),
                          className: "rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5",
                          children: "+ Add"
                        }
                      ),
                      milestones.length > 1 && /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => setMilestones((m) => m.slice(0, -1)),
                          className: "rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5",
                          children: "− Remove"
                        }
                      )
                    ] })
                  ] }),
                  milestones.map((m, i) => /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[1fr_140px_40px] gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "input-dark rounded-lg px-3 py-2 text-sm font-mono",
                        placeholder: "Milestone name",
                        value: m.name,
                        onChange: (e) => updateMilestone(i, "name", e.target.value)
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "input-dark rounded-lg px-3 py-2 text-sm font-mono",
                        placeholder: "Amount µSTX",
                        value: m.amount,
                        onChange: (e) => updateMilestone(i, "amount", e.target.value)
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center text-xs text-white/40", children: [
                      "#",
                      i
                    ] })
                  ] }, i))
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    disabled: !wallet.connected || tx2.status === "broadcasting",
                    onClick: handleCreateCampaign,
                    className: "neon-btn rounded-lg px-4 py-2 text-sm font-semibold",
                    children: "Create Campaign"
                  }
                ),
                /* @__PURE__ */ jsx(StatusBadge, { tx: tx2 })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            StepCard,
            {
              index: 3,
              title: "Deposit (backer)",
              description: "Back the campaign by depositing STX into escrow.",
              done: tx3.status === "confirmed",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ jsx(
                    Field,
                    {
                      label: "Campaign ID",
                      value: depositCampaignId,
                      onChange: (e) => setDepositCampaignId(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Field,
                    {
                      label: "Amount (µSTX)",
                      value: depositAmount,
                      onChange: (e) => setDepositAmount(e.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    disabled: !wallet.connected || tx3.status === "broadcasting",
                    onClick: handleDeposit,
                    className: "neon-btn rounded-lg px-4 py-2 text-sm font-semibold",
                    children: "Deposit STX"
                  }
                ),
                /* @__PURE__ */ jsx(StatusBadge, { tx: tx3 })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            StepCard,
            {
              index: 4,
              title: "Approve milestone",
              description: "Mark a milestone as complete to unlock its funds.",
              done: tx4.status === "confirmed",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ jsx(
                    Field,
                    {
                      label: "Campaign ID",
                      value: approveCampaignId,
                      onChange: (e) => setApproveCampaignId(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Field,
                    {
                      label: "Milestone Index",
                      value: approveIndex,
                      onChange: (e) => setApproveIndex(e.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    disabled: !wallet.connected || tx4.status === "broadcasting",
                    onClick: handleApprove,
                    className: "neon-btn rounded-lg px-4 py-2 text-sm font-semibold",
                    children: "Approve Milestone"
                  }
                ),
                /* @__PURE__ */ jsx(StatusBadge, { tx: tx4 })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            StepCard,
            {
              index: 5,
              title: "Release funds",
              description: "Release the approved milestone's escrowed STX to the creator.",
              done: tx5.status === "confirmed",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ jsx(
                    Field,
                    {
                      label: "Campaign ID",
                      value: releaseCampaignId,
                      onChange: (e) => setReleaseCampaignId(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Field,
                    {
                      label: "Milestone Index",
                      value: releaseIndex,
                      onChange: (e) => setReleaseIndex(e.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    disabled: !wallet.connected || tx5.status === "broadcasting",
                    onClick: handleRelease,
                    className: "neon-btn rounded-lg px-4 py-2 text-sm font-semibold",
                    children: "Release Funds"
                  }
                ),
                /* @__PURE__ */ jsx(StatusBadge, { tx: tx5 })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("aside", { className: "lg:sticky lg:top-24 h-fit", children: [
          /* @__PURE__ */ jsxs("div", { className: "glass-strong rounded-2xl p-5", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold uppercase tracking-wider text-white/70", children: "Campaign State" }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => refreshCampaign(campaignId),
                  disabled: !wallet.connected || loadingState,
                  className: "rounded-md border border-[#4ade80]/40 px-2 py-1 text-xs text-[#4ade80] hover:bg-[#4ade80]/10 disabled:opacity-40",
                  children: loadingState ? "…" : "Refresh"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-white/50 mb-3", children: [
              "Read-only call to",
              " ",
              /* @__PURE__ */ jsx("code", { className: "text-[#4ade80]", children: "get-campaign" }),
              " on ",
              ESCROW_CONTRACT,
              "."
            ] }),
            /* @__PURE__ */ jsx("pre", { className: "max-h-[420px] overflow-auto rounded-lg bg-black/60 p-3 text-[11px] leading-relaxed text-[#4ade80]/90 font-mono", children: campaignState ? JSON.stringify(campaignState, null, 2) : "// Run a step to populate" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-4 glass rounded-2xl p-5 text-xs text-white/60", children: [
            /* @__PURE__ */ jsx("div", { className: "mb-2 font-semibold uppercase tracking-wider text-white/70", children: "Contracts" }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1 font-mono break-all", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-white/40", children: "Address:" }),
                " ",
                /* @__PURE__ */ jsx("span", { className: "text-[#4ade80]", children: CONTRACT_ADDRESS })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-white/40", children: "Verification:" }),
                " ",
                /* @__PURE__ */ jsx("span", { className: "text-white/80", children: VERIFICATION_CONTRACT })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-white/40", children: "Escrow:" }),
                " ",
                /* @__PURE__ */ jsx("span", { className: "text-white/80", children: ESCROW_CONTRACT })
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("footer", { className: "mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/40", children: [
        "Built on Stacks · Testnet only · ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " CineX"
      ] })
    ] })
  ] });
}
const SplitComponent = CineXDemo;
export {
  SplitComponent as component
};
