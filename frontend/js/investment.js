// investment.js - Dynamic Investment Calculator
document.addEventListener('DOMContentLoaded', function() {
    // Plan configurations (ROI percentages)
    const plans = {
      'Gold Plan': { roi: 120, min: 25000, max: 500000 },
      'Silver Plan': { roi: 80, min:500, max: 24000 },
      'Bronze Plan': { roi: 50, min: 200, max: 12500 }
    };
  
    // DOM elements
    const planSelect = document.querySelector('.plan-select');
    const amountInput = document.querySelector('.amount-input');
    const dailyProfitEl = document.querySelector('.daily-profit');
    const totalProfitEl = document.querySelector('.total-profit');
    const investBtn = document.querySelector('.btn-invest');
  
    // Update calculations when plan or amount changes
    function updateCalculations() {
      const selectedPlan = planSelect.value;
      const amount = parseFloat(amountInput.value) || 0;
      const plan = plans[selectedPlan];
      
      if (plan) {
        // Calculate daily and total profit (ROI is percentage of investment)
        const dailyProfit = (amount * (plan.roi / 100) / 30);
        const totalProfit = amount * (plan.roi / 100);
        
        // Update display
        dailyProfitEl.textContent = `$${dailyProfit.toFixed(2)}`;
        totalProfitEl.textContent = `$${totalProfit.toFixed(2)}`;
      }
    }
  
    // Auto-select plan based on investment amount
    function autoSelectPlan() {
      const amount = parseFloat(amountInput.value) || 0;
      
      // Find the appropriate plan
      let selectedPlan = 'Bronze Plan'; // Default
      if (amount >= plans['Gold Plan'].min) {
        selectedPlan = 'Gold Plan';
      } else if (amount >= plans['Silver Plan'].min) {
        selectedPlan = 'Silver Plan';
      }
      
      // Update dropdown if different from current selection
      if (planSelect.value !== selectedPlan) {
        planSelect.value = selectedPlan;
        updateCalculations();
      }
    }
  
    // Event listeners
    planSelect.addEventListener('change', updateCalculations);
    amountInput.addEventListener('input', function() {
      autoSelectPlan();
      updateCalculations();
    });
  
    // Initialize calculations
    updateCalculations();
  
    // Form submission handler
    investBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const amount = parseFloat(amountInput.value);
      const selectedPlan = planSelect.value;
      const plan = plans[selectedPlan];
      
      // Validate amount
      if (isNaN(amount)) {
        alert('Please enter a valid investment amount');
        return;
      }
      
      if (amount < plan.min || amount > plan.max) {
        alert(`Amount must be between $${plan.min} and $${plan.max} for ${selectedPlan}`);
        return;
      }
      
      // Here you would typically submit to your backend
      alert(`Investing $${amount.toFixed(2)} in ${selectedPlan}`);
      // document.querySelector('.investment-form').submit();
    });
  });