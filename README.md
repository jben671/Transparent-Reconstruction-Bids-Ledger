# 🌪️ Transparent Reconstruction Bids Ledger

Welcome to a revolutionary blockchain-based system designed to combat corruption in post-disaster reconstruction! By leveraging the Stacks blockchain and Clarity smart contracts, this project creates an immutable, transparent ledger for managing bids on reconstruction contracts. All submissions, evaluations, and awards are publicly verifiable, ensuring fair play and accountability in disaster recovery efforts.

## ✨ Features

🔒 Immutable bid submissions to prevent tampering  
📈 Transparent evaluation and award processes  
🏗️ Project registration for reconstruction needs  
👥 User roles for authorities, bidders, and verifiers  
⚖️ Built-in dispute resolution mechanism  
🔍 Public audit trails for full transparency  
💰 Escrow for secure fund handling  
🚫 Anti-collusion measures via staking  

## 🛠 How It Works

**For Authorities (e.g., Government Agencies)**  
- Register a new reconstruction project with details like location, scope, and budget.  
- Open the bidding period and set evaluation criteria.  
- Review submitted bids on-chain, evaluate them transparently, and award the contract.  
- Release escrowed funds upon verified project completion.  

**For Bidders (e.g., Contractors)**  
- Register as a verified bidder by staking tokens to prove legitimacy.  
- Submit sealed bids (hashed for privacy until reveal) with cost estimates and timelines.  
- Monitor the evaluation process and appeal if disputes arise.  

**For Verifiers and the Public**  
- Query any project's bid history, evaluations, and awards.  
- Verify the integrity of the process through immutable logs.  
- Report potential issues via the dispute contract for on-chain resolution.  

This setup ensures every step is logged on the blockchain, making corruption nearly impossible by exposing all actions to public scrutiny.

## 📜 Smart Contracts

The system is built with 8 Clarity smart contracts for modularity and security:  

1. **UserRegistry.clar**: Handles registration and role assignment for authorities, bidders, and verifiers. Includes staking requirements to prevent spam.  
2. **ProjectRegistry.clar**: Allows authorities to create and manage reconstruction projects, including details like deadlines and requirements.  
3. **BidSubmission.clar**: Enables bidders to submit hashed bids during open periods, ensuring privacy until the reveal phase.  
4. **BidReveal.clar**: Manages the unsealing of bids after the submission deadline, making them public for evaluation.  
5. **EvaluationEngine.clar**: Automates or records manual evaluations based on predefined criteria, scoring bids transparently.  
6. **AwardContract.clar**: Finalizes contract awards by authorities, logging the winner and reasons immutably.  
7. **PaymentEscrow.clar**: Holds funds in escrow, releasing them only upon verified milestones or completion.  
8. **DisputeResolution.clar**: Facilitates on-chain disputes, allowing evidence submission and community or oracle-based resolution.  

These contracts interact seamlessly, with events emitted for real-time monitoring. Deploy them on Stacks for a corruption-proof bidding ecosystem!