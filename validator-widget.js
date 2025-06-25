// Solana Validator Widget
// Author: AndrewInUA
// https://github.com/AndrewInUA/solana-validator-metrics-html-widget
let voteAccount = "";

(async function () {
  const container = document.querySelector('[data-vote-account]');
  voteAccount = container?.getAttribute('data-vote-account') || voteAccount;
  let validatorName = voteAccount;

  if (!voteAccount) {
    console.warn("Validator Widget: Missing vote account.");
    return;
  }

  const safeText = (val, fallback = "Unavailable") => {
    return typeof val === "string" && val.trim() ? val : fallback;
  };

  const formatPercent = (val, decimals = 2) => {
    return typeof val === "number" && !isNaN(val) ? `${val.toFixed(decimals)}%` : "N/A";
  };

  const formatNumber = (val) => {
    return typeof val === "number" && !isNaN(val) ? Math.round(val) : "N/A";
  };

  // Stakewiz API — Commission, APY, Stake, Uptime, Skip Rate, Jito Commission
  async function fetchStakewizData() {
    try {
      const url = `https://api.stakewiz.com/validator/${voteAccount}`;
      
      const allValidatorsResponse = await fetch("https://api.stakewiz.com/validators");
      const allValidatorsData = await allValidatorsResponse.json();
      const totalValidators = allValidatorsData.length;
      
      const response = await fetch(url);
      const data = await response.json();
      const loc = (data.ip_city ? data.ip_city + ", " : "") + (data.ip_country || "");
      validatorName = data.name || `No name ${voteAccount}`;
      document.getElementById("vote-account-display").innerText = voteAccount;
      document.getElementById("widget-title").innerText = validatorName;
      document.getElementById("stakewiz-rank").innerText = `#${data.rank} / ${totalValidators}`;
      document.getElementById("commission-value").innerText = formatPercent(data.commission, 0);
      document.getElementById("apy-value").innerText = formatPercent(data.total_apy);
      document.getElementById("stake-value").innerText = `${formatNumber(data.activated_stake)} SOL`;
      document.getElementById("uptime-value").innerText = formatPercent(data.uptime);
      document.getElementById("skiprate-value").innerText = formatPercent(data.skip_rate * 100, 0);
      document.getElementById("client-version").innerText = safeText(data.version, "Unknown");
      document.getElementById("validator-location").innerText = loc || "Unknown";

      const jitoCommission = data.jito_commission_bps / 100;
      document.getElementById("jito-commission-value").innerText = formatPercent(jitoCommission);
    } catch (error) {
      console.error("Stakewiz API error:", error);
    }
  }

  // Jito Score API
  async function fetchJitoScore() {
    try {
      const url = `https://kobe.mainnet.jito.network/api/v1/steward_events?limit=1&event_type=ScoreComponentsV2&vote_account=${voteAccount}`;
      const res = await fetch(url);
      const data = await res.json();
      const score = Math.round(data.events[0].data.score * 10000) / 100;
      document.getElementById("jito-value").innerText = formatPercent(score, 2);
    } catch (e) {
      console.error("Jito Score error:", e);
      document.getElementById("jito-value").innerText = "Unavailable";
    }
  }

  // Edgevana Rank
async function fetchEdgevanaRank() {
  try {
    const res = await fetch("https://api.stake.edgevana.com/api/v2/scores");
    const all = await res.json();

    const sortedAll = [...all].sort((a, b) => b.score - a.score);
    const edgevanaOnly = all.filter(v => v.edgevana_node);
    const sortedEdgevana = [...edgevanaOnly].sort((a, b) => b.score - a.score);

    const validator = all.find(v => v.vote_account === voteAccount);

    let rankText = "N/A";
    let sourceText = "Source: Edgevana";

    if (validator) {
      if (validator.edgevana_node) {
        const index = sortedEdgevana.findIndex(v => v.vote_account === voteAccount);
        rankText = index >= 0 ? `#${index + 1}` : "N/A";
      } else {
        const index = sortedAll.findIndex(v => v.vote_account === voteAccount);
        rankText = index >= 0 ? `#${index + 1}` : "N/A";
        sourceText = "not in Edgevana DC";
      }
    }


    document.getElementById("edgevana-rank").innerHTML = rankText;
    document.getElementById("edgevana-source").innerText = sourceText;
  } catch (e) {
    console.error("Edgevana fetch error:", e);
    document.getElementById("edgevana-rank").innerText = "Unavailable";
    document.getElementById("edgevana-source").innerText = "";
  }
}


  // JPool Rank & VA Score
  async function fetchJPoolStats() {
    try {
      const res = await fetch("https://api.thevalidators.io/jpool-scores/802?select=voteId,membershipRank,jpoolScore,jpoolRank,vaTotalScore,apy10Rank");
      const json = await res.json();
      const list = json.data;
      const v = list.find(e => e.voteId === voteAccount);
      if (v) {
        document.getElementById("jpool-rank").innerHTML = `#${v.jpoolRank}`;
        document.getElementById("va-score").innerText = `${Math.round((v.vaTotalScore / 13) * 100)}%`;
        document.getElementById("va-raw-score").innerText = v.vaTotalScore;
      }
    } catch (e) {
      console.error("JPool fetch error:", e);
      document.getElementById("jpool-rank").innerText = "Unavailable";
      document.getElementById("va-score").innerText = "Unavailable";
    }
  }

  // Vault Pool Stake Rank
  async function fetchVaultRank() {
    try {
      const latestPath = "https://raw.githubusercontent.com/SolanaVault/stakebot-data/main/bot-stats-latest.txt";
      const latestRes = await fetch(latestPath);
      const latestText = await latestRes.text();
      const dataUrl = `https://raw.githubusercontent.com/SolanaVault/stakebot-data/main/${latestText.trim()}`;
      const dataRes = await fetch(dataUrl);
      const data = await dataRes.json();
      const all = data.validatorTargets;
      const sorted = all.sort((a, b) => +b.targetTotalStake - +a.targetTotalStake);
      const index = sorted.findIndex(e => e.votePubkey === voteAccount);
      document.getElementById("vault-rank").innerHTML = index >= 0 ? `#${index + 1}` : "Not in pool";
    } catch (e) {
      console.error("Vault fetch error:", e);
      document.getElementById("vault-rank").innerText = "Unavailable";
    }
  }
  
    async function setLastUpdated() {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const ss = now.getSeconds().toString().padStart(2, '0');
      const dd = now.getDate().toString().padStart(2, '0');
      const mo = (now.getMonth() + 1).toString().padStart(2, '0');
      const yy = now.getFullYear();
      document.getElementById("last-updated").innerText = `Last updated: ${yy}-${mo}-${dd} ${hh}:${mm}:${ss}`;
    }

  
    // Run all
    async function init() {
      await fetchStakewizData();
      await fetchJitoScore();
      await fetchEdgevanaRank();
      await fetchJPoolStats();
      await fetchVaultRank();
      await setLastUpdated();
    }
    
    init();
    
    // Додати loadAllMetrics всередину
    window.loadAllMetrics = async function loadAllMetrics(newVoteAccount) {
      if (newVoteAccount) voteAccount = newVoteAccount;
      try {
        await fetchStakewizData();
        await fetchJitoScore();
        await fetchEdgevanaRank();
        await fetchJPoolStats();
        await fetchVaultRank();
        await setLastUpdated();
      } catch (err) {
        console.error("Error loading metrics:", err);
      }
    }

})();

  
    // Copy Vote Account
    function copyVoteAccount() {
      const valueElement = document.getElementById("vote-account-display");
      const voteAccount = valueElement.innerText;
    
      // Check for API availability
      if (!navigator.clipboard) {
        console.warn("Clipboard API not available");
        return;
      }
    
      navigator.clipboard.writeText(voteAccount)
        .then(() => {
          const hint = document.getElementById("copy-hint");
          hint.innerText = "Copied!";
          setTimeout(() => {
            hint.innerText = "Click to copy";
          }, 1500);
        })
        .catch(err => {
          console.error("Copy failed", err);
        });
    }
