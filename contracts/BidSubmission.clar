(define-constant ERR_NOT_AUTHORIZED u100)
(define-constant ERR_INVALID_PROJECT u101)
(define-constant ERR_BIDDING_CLOSED u102)
(define-constant ERR_INVALID_HASH u103)
(define-constant ERR_INSUFFICIENT_STAKE u104)
(define-constant ERR_INVALID_AMOUNT u105)
(define-constant ERR_BID_ALREADY_EXISTS u106)
(define-constant ERR_INVALID_TIMESTAMP u107)
(define-constant ERR_PROJECT_NOT_FOUND u108)
(define-constant ERR_BIDDER_NOT_REGISTERED u109)
(define-constant ERR_STAKE_TRANSFER_FAILED u110)
(define-constant ERR_INVALID_STAKE_AMOUNT u111)
(define-constant ERR_BIDDING_NOT_STARTED u112)
(define-constant ERR_MAX_BIDS_EXCEEDED u113)
(define-constant ERR_INVALID_BID_TYPE u114)
(define-constant ERR_INVALID_SUPPORT_DOCS u115)
(define-constant ERR_INVALID_TEAM_SIZE u116)
(define-constant ERR_INVALID_EXPERIENCE_LEVEL u117)
(define-constant ERR_INVALID_REPUTATION_SCORE u118)
(define-constant ERR_INVALID_BID_DURATION u119)
(define-constant ERR_INVALID_PAYMENT_TERMS u120)
(define-constant ERR_UPDATE_NOT_ALLOWED u121)
(define-constant ERR_INVALID_UPDATE_HASH u122)
(define-constant ERR_AUTHORITY_NOT_VERIFIED u123)
(define-constant ERR_INVALID_BID_ID u124)
(define-constant ERR_BID_NOT_FOUND u125)

(define-data-var next-bid-id uint u0)
(define-data-var max-bids-per-project uint u100)
(define-data-var submission-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map Bids
  uint
  {
    project-id: uint,
    bidder: principal,
    bid-hash: (buff 32),
    amount: uint,
    timestamp: uint,
    stake-amount: uint,
    bid-type: (string-utf8 50),
    support-docs-hash: (buff 32),
    team-size: uint,
    experience-level: uint,
    reputation-score: uint,
    bid-duration: uint,
    payment-terms: (string-utf8 100)
  }
)

(define-map BidsByProjectBidder
  { project-id: uint, bidder: principal }
  uint
)

(define-map BidUpdates
  uint
  {
    update-hash: (buff 32),
    update-amount: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-map ProjectBidCounts
  uint
  uint
)

(define-read-only (get-bid (bid-id uint))
  (map-get? Bids bid-id)
)

(define-read-only (get-bid-by-project-bidder (project-id uint) (bidder principal))
  (let ((bid-id (map-get? BidsByProjectBidder { project-id: project-id, bidder: bidder })))
    (match bid-id id (map-get? Bids id) none))
)

(define-read-only (get-bid-updates (bid-id uint))
  (map-get? BidUpdates bid-id)
)

(define-read-only (is-bid-registered (project-id uint) (bidder principal))
  (is-some (map-get? BidsByProjectBidder { project-id: project-id, bidder: bidder }))
)

(define-read-only (get-project-bid-count (project-id uint))
  (default-to u0 (map-get? ProjectBidCounts project-id))
)

(define-private (validate-hash (h (buff 32)))
  (if (is-eq (len h) u32)
      (ok true)
      (err ERR_INVALID_HASH))
)

(define-private (validate-amount (a uint))
  (if (> a u0)
      (ok true)
      (err ERR_INVALID_AMOUNT))
)

(define-private (validate-stake-amount (s uint) (min-stake uint))
  (if (>= s min-stake)
      (ok true)
      (err ERR_INSUFFICIENT_STAKE))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR_INVALID_TIMESTAMP))
)

(define-private (validate-bid-type (bt (string-utf8 50)))
  (if (or (is-eq bt "fixed") (is-eq bt "hourly") (is-eq bt "milestone"))
      (ok true)
      (err ERR_INVALID_BID_TYPE))
)

(define-private (validate-support-docs (sd (buff 32)))
  (if (is-eq (len sd) u32)
      (ok true)
      (err ERR_INVALID_SUPPORT_DOCS))
)

(define-private (validate-team-size (ts uint))
  (if (and (> ts u0) (<= ts u100))
      (ok true)
      (err ERR_INVALID_TEAM_SIZE))
)

(define-private (validate-experience-level (el uint))
  (if (and (>= el u1) (<= el u10))
      (ok true)
      (err ERR_INVALID_EXPERIENCE_LEVEL))
)

(define-private (validate-reputation-score (rs uint))
  (if (and (>= rs u0) (<= rs u100))
      (ok true)
      (err ERR_INVALID_REPUTATION_SCORE))
)

(define-private (validate-bid-duration (bd uint))
  (if (> bd u0)
      (ok true)
      (err ERR_INVALID_BID_DURATION))
)

(define-private (validate-payment-terms (pt (string-utf8 100)))
  (if (> (len pt) u0)
      (ok true)
      (err ERR_INVALID_PAYMENT_TERMS))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get authority-contract)) (err ERR_AUTHORITY_NOT_VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true))
)

(define-public (set-max-bids-per-project (new-max uint))
  (begin
    (asserts! (is-some (var-get authority-contract)) (err ERR_AUTHORITY_NOT_VERIFIED))
    (var-set max-bids-per-project new-max)
    (ok true))
)

(define-public (set-submission-fee (new-fee uint))
  (begin
    (asserts! (is-some (var-get authority-contract)) (err ERR_AUTHORITY_NOT_VERIFIED))
    (var-set submission-fee new-fee)
    (ok true))
)

(define-public (submit-bid
  (project-id uint)
  (bid-hash (buff 32))
  (amount uint)
  (stake-amount uint)
  (bid-type (string-utf8 50))
  (support-docs-hash (buff 32))
  (team-size uint)
  (experience-level uint)
  (reputation-score uint)
  (bid-duration uint)
  (payment-terms (string-utf8 100)))
  (let
    (
      (bidder tx-sender)
      (next-id (var-get next-bid-id))
      (project (unwrap! (contract-call? .ProjectRegistry get-project project-id) (err ERR_INVALID_PROJECT)))
      (current-time block-height)
      (bid-count (get-project-bid-count project-id))
      (max-bids (var-get max-bids-per-project))
      (min-stake (get minimum-stake project))
      (authority-check (contract-call? .UserRegistry is-verified-bidder bidder))
    )
    (asserts! (> current-time (get bidding-start project)) (err ERR_BIDDING_NOT_STARTED))
    (asserts! (<= current-time (get bidding-deadline project)) (err ERR_BIDDING_CLOSED))
    (asserts! (< bid-count max-bids) (err ERR_MAX_BIDS_EXCEEDED))
    (try! (validate-hash bid-hash))
    (try! (validate-amount amount))
    (try! (validate-stake-amount stake-amount min-stake))
    (try! (validate-bid-type bid-type))
    (try! (validate-support-docs support-docs-hash))
    (try! (validate-team-size team-size))
    (try! (validate-experience-level experience-level))
    (try! (validate-reputation-score reputation-score))
    (try! (validate-bid-duration bid-duration))
    (try! (validate-payment-terms payment-terms))
    (asserts! (is-ok authority-check) (err ERR_NOT_AUTHORIZED))
    (asserts! (not (is-bid-registered project-id bidder)) (err ERR_BID_ALREADY_EXISTS))
    (try! (stx-transfer? stake-amount tx-sender (as-contract tx-sender)))
    (map-set Bids next-id
      {
        project-id: project-id,
        bidder: bidder,
        bid-hash: bid-hash,
        amount: amount,
        timestamp: current-time,
        stake-amount: stake-amount,
        bid-type: bid-type,
        support-docs-hash: support-docs-hash,
        team-size: team-size,
        experience-level: experience-level,
        reputation-score: reputation-score,
        bid-duration: bid-duration,
        payment-terms: payment-terms
      }
    )
    (map-set BidsByProjectBidder { project-id: project-id, bidder: bidder } next-id)
    (map-set ProjectBidCounts project-id (+ bid-count u1))
    (var-set next-bid-id (+ next-id u1))
    (print { event: "bid-submitted", id: next-id })
    (ok next-id))
)

(define-public (update-bid
  (bid-id uint)
  (update-hash (buff 32))
  (update-amount uint))
  (let
    (
      (bid (unwrap! (map-get? Bids bid-id) (err ERR_BID_NOT_FOUND)))
      (project (unwrap! (contract-call? .ProjectRegistry get-project (get project-id bid)) (err ERR_INVALID_PROJECT)))
      (current-time block-height)
      (authority-check (contract-call? .UserRegistry is-verified-bidder tx-sender))
    )
    (asserts! (is-eq (get bidder bid) tx-sender) (err ERR_NOT_AUTHORIZED))
    (asserts! (<= current-time (get bidding-deadline project)) (err ERR_UPDATE_NOT_ALLOWED))
    (try! (validate-hash update-hash))
    (try! (validate-amount update-amount))
    (asserts! (is-ok authority-check) (err ERR_NOT_AUTHORIZED))
    (map-set Bids bid-id
      (merge bid
        {
          bid-hash: update-hash,
          amount: update-amount,
          timestamp: current-time
        }
      )
    )
    (map-set BidUpdates bid-id
      {
        update-hash: update-hash,
        update-amount: update-amount,
        update-timestamp: current-time,
        updater: tx-sender
      }
    )
    (print { event: "bid-updated", id: bid-id })
    (ok true))
)

(define-public (get-bid-count)
  (ok (var-get next-bid-id))
)

(define-public (check-bid-existence (project-id uint) (bidder principal))
  (ok (is-bid-registered project-id bidder))
)