import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PROJECT = 101;
const ERR_BIDDING_CLOSED = 102;
const ERR_INVALID_HASH = 103;
const ERR_INSUFFICIENT_STAKE = 104;
const ERR_INVALID_AMOUNT = 105;
const ERR_BID_ALREADY_EXISTS = 106;
const ERR_INVALID_TIMESTAMP = 107;
const ERR_PROJECT_NOT_FOUND = 108;
const ERR_BIDDER_NOT_REGISTERED = 109;
const ERR_STAKE_TRANSFER_FAILED = 110;
const ERR_INVALID_STAKE_AMOUNT = 111;
const ERR_BIDDING_NOT_STARTED = 112;
const ERR_MAX_BIDS_EXCEEDED = 113;
const ERR_INVALID_BID_TYPE = 114;
const ERR_INVALID_SUPPORT_DOCS = 115;
const ERR_INVALID_TEAM_SIZE = 116;
const ERR_INVALID_EXPERIENCE_LEVEL = 117;
const ERR_INVALID_REPUTATION_SCORE = 118;
const ERR_INVALID_BID_DURATION = 119;
const ERR_INVALID_PAYMENT_TERMS = 120;
const ERR_UPDATE_NOT_ALLOWED = 121;
const ERR_INVALID_UPDATE_HASH = 122;
const ERR_AUTHORITY_NOT_VERIFIED = 123;
const ERR_INVALID_BID_ID = 124;
const ERR_BID_NOT_FOUND = 125;

interface Project {
  biddingStart: number;
  biddingDeadline: number;
  minimumStake: number;
}

interface Bid {
  projectId: number;
  bidder: string;
  bidHash: string;
  amount: number;
  timestamp: number;
  stakeAmount: number;
  bidType: string;
  supportDocsHash: string;
  teamSize: number;
  experienceLevel: number;
  reputationScore: number;
  bidDuration: number;
  paymentTerms: string;
}

interface BidUpdate {
  updateHash: string;
  updateAmount: number;
  updateTimestamp: number;
  updater: string;
}

class BidSubmissionMock {
  state!: {
    nextBidId: number;
    maxBidsPerProject: number;
    bids: Map<number, Bid>;
    bidsByProjectBidder: Map<string, number>;
    bidUpdates: Map<number, BidUpdate>;
    projectBidCounts: Map<number, number>;
  };
  blockHeight = 50;
  caller = "ST1TEST";
  projects = new Map<number, Project>();
  verifiedBidders = new Set<string>();

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextBidId: 0,
      maxBidsPerProject: 100,
      bids: new Map(),
      bidsByProjectBidder: new Map(),
      bidUpdates: new Map(),
      projectBidCounts: new Map(),
    };
    this.blockHeight = 50;
    this.caller = "ST1TEST";
    this.verifiedBidders.add("ST1TEST");
    this.projects.set(1, { biddingStart: 0, biddingDeadline: 100, minimumStake: 10 });
  }

  getProject(projectId: number): { ok: boolean; value: Project | null } {
    const project = this.projects.get(projectId);
    return project ? { ok: true, value: project } : { ok: false, value: null };
  }

  isVerifiedBidder(bidder: string): { ok: boolean; value: boolean } {
    return { ok: true, value: this.verifiedBidders.has(bidder) };
  }

  stxTransfer(amount: number, from: string, to: string): { ok: boolean; value: boolean } {
    return { ok: true, value: true };
  }

  submitBid(
    projectId: number,
    bidHash: string,
    amount: number,
    stakeAmount: number,
    bidType: string,
    supportDocsHash: string,
    teamSize: number,
    experienceLevel: number,
    reputationScore: number,
    bidDuration: number,
    paymentTerms: string
  ): { ok: boolean; value: number | number } {
    const projectRes = this.getProject(projectId);
    if (!projectRes.ok || !projectRes.value) return { ok: false, value: ERR_INVALID_PROJECT };
    const project = projectRes.value;
    const currentTime = this.blockHeight;
    if (currentTime <= project.biddingStart) return { ok: false, value: ERR_BIDDING_NOT_STARTED };
    if (currentTime > project.biddingDeadline) return { ok: false, value: ERR_BIDDING_CLOSED };
    const bidCount = this.state.projectBidCounts.get(projectId) ?? 0;
    if (bidCount >= this.state.maxBidsPerProject) return { ok: false, value: ERR_MAX_BIDS_EXCEEDED };
    if (!this.isVerifiedBidder(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const key = `${projectId}-${this.caller}`;
    if (this.state.bidsByProjectBidder.has(key)) return { ok: false, value: ERR_BID_ALREADY_EXISTS };
    if (bidHash.length !== 64 || !/^[0-9a-fA-F]+$/.test(bidHash)) return { ok: false, value: ERR_INVALID_HASH };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (stakeAmount < project.minimumStake) return { ok: false, value: ERR_INSUFFICIENT_STAKE };
    if (!["fixed", "hourly", "milestone"].includes(bidType)) return { ok: false, value: ERR_INVALID_BID_TYPE };
    if (supportDocsHash.length !== 64 || !/^[0-9a-fA-F]+$/.test(supportDocsHash)) return { ok: false, value: ERR_INVALID_SUPPORT_DOCS };
    if (teamSize <= 0 || teamSize > 100) return { ok: false, value: ERR_INVALID_TEAM_SIZE };
    if (experienceLevel < 1 || experienceLevel > 10) return { ok: false, value: ERR_INVALID_EXPERIENCE_LEVEL };
    if (reputationScore < 0 || reputationScore > 100) return { ok: false, value: ERR_INVALID_REPUTATION_SCORE };
    if (bidDuration <= 0) return { ok: false, value: ERR_INVALID_BID_DURATION };
    if (!paymentTerms || paymentTerms.length > 100) return { ok: false, value: ERR_INVALID_PAYMENT_TERMS };
    const transferRes = this.stxTransfer(stakeAmount, this.caller, "contract");
    if (!transferRes.ok) return { ok: false, value: ERR_STAKE_TRANSFER_FAILED };

    const nextId = this.state.nextBidId;
    const newBid: Bid = {
      projectId,
      bidder: this.caller,
      bidHash,
      amount,
      timestamp: currentTime,
      stakeAmount,
      bidType,
      supportDocsHash,
      teamSize,
      experienceLevel,
      reputationScore,
      bidDuration,
      paymentTerms,
    };
    this.state.bids.set(nextId, newBid);
    this.state.bidsByProjectBidder.set(key, nextId);
    this.state.projectBidCounts.set(projectId, bidCount + 1);
    this.state.nextBidId++;
    return { ok: true, value: nextId };
  }

  getBid(bidId: number): { ok: boolean; value: Bid | null } {
    const bid = this.state.bids.get(bidId);
    return bid ? { ok: true, value: bid } : { ok: false, value: null };
  }

  updateBid(bidId: number, updateHash: string, updateAmount: number): { ok: boolean; value: boolean | number } {
    const bidRes = this.getBid(bidId);
    if (!bidRes.ok || !bidRes.value) return { ok: false, value: ERR_BID_NOT_FOUND };
    const bid = bidRes.value;
    const projectRes = this.getProject(bid.projectId);
    if (!projectRes.ok || !projectRes.value) return { ok: false, value: ERR_INVALID_PROJECT };
    const project = projectRes.value;
    const currentTime = this.blockHeight;
    if (bid.bidder !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (currentTime > project.biddingDeadline) return { ok: false, value: ERR_UPDATE_NOT_ALLOWED };
    if (updateHash.length !== 64 || !/^[0-9a-fA-F]+$/.test(updateHash)) return { ok: false, value: ERR_INVALID_UPDATE_HASH };
    if (updateAmount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (!this.isVerifiedBidder(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };

    const updatedBid: Bid = { ...bid, bidHash: updateHash, amount: updateAmount, timestamp: currentTime };
    this.state.bids.set(bidId, updatedBid);
    this.state.bidUpdates.set(bidId, {
      updateHash,
      updateAmount,
      updateTimestamp: currentTime,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }
}

describe("BidSubmission", () => {
  let contract: BidSubmissionMock;
  beforeEach(() => (contract = new BidSubmissionMock()));

  it("submits a valid bid", () => {
    const result = contract.submitBid(
      1,
      "a".repeat(64),
      1000,
      10,
      "fixed",
      "b".repeat(64),
      5,
      7,
      85,
      30,
      "50% upfront"
    );
    expect(result.ok).toBe(true);
    const bid = contract.getBid(0).value;
    expect(bid?.amount).toBe(1000);
    expect(bid?.bidType).toBe("fixed");
    expect(bid?.teamSize).toBe(5);
    expect(bid?.projectId).toBe(1);
    expect(bid?.timestamp).toBe(50);
  });

  it("rejects invalid hash", () => {
    const result = contract.submitBid(
      1,
      "bad",
      1000,
      10,
      "fixed",
      "b".repeat(64),
      5,
      7,
      85,
      30,
      "50% upfront"
    );
    expect(result).toEqual({ ok: false, value: ERR_INVALID_HASH });
  });

  it("rejects insufficient stake", () => {
    const result = contract.submitBid(
      1,
      "a".repeat(64),
      1000,
      5,
      "fixed",
      "b".repeat(64),
      5,
      7,
      85,
      30,
      "50% upfront"
    );
    expect(result).toEqual({ ok: false, value: ERR_INSUFFICIENT_STAKE });
  });

  it("rejects duplicate bid", () => {
    contract.submitBid(
      1,
      "a".repeat(64),
      1000,
      10,
      "fixed",
      "b".repeat(64),
      5,
      7,
      85,
      30,
      "50% upfront"
    );
    const result = contract.submitBid(
      1,
      "c".repeat(64),
      2000,
      10,
      "fixed",
      "d".repeat(64),
      5,
      7,
      85,
      30,
      "50% upfront"
    );
    expect(result).toEqual({ ok: false, value: ERR_BID_ALREADY_EXISTS });
  });

  it("updates a valid bid", () => {
    contract.submitBid(
      1,
      "a".repeat(64),
      1000,
      10,
      "fixed",
      "b".repeat(64),
      5,
      7,
      85,
      30,
      "50% upfront"
    );
    const result = contract.updateBid(0, "c".repeat(64), 1500);
    expect(result.ok).toBe(true);
    expect(contract.getBid(0).value?.amount).toBe(1500);
    expect(contract.getBid(0).value?.bidHash).toBe("c".repeat(64));
  });

  it("rejects update for non-existent bid", () => {
    const result = contract.updateBid(99, "c".repeat(64), 1500);
    expect(result).toEqual({ ok: false, value: ERR_BID_NOT_FOUND });
  });

  it("rejects update after bidding closed", () => {
    contract.submitBid(
      1,
      "a".repeat(64),
      1000,
      10,
      "fixed",
      "b".repeat(64),
      5,
      7,
      85,
      30,
      "50% upfront"
    );
    contract.blockHeight = 101;
    const result = contract.updateBid(0, "c".repeat(64), 1500);
    expect(result).toEqual({ ok: false, value: ERR_UPDATE_NOT_ALLOWED });
  });
});