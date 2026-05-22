// Auth removed: stub to avoid errors from removed UI
window.Auth = {
    init: async function(){ return; },
    getConfig: async function(){ return { enabled: false }; },
    getRole: async function(){ return null; },
    login: async function(){ return false; },
    logout: function(){},
    isLoggedIn: async function(){ return false; },
    showLogin: function(){},
    setRoleCode: async function(){ return false; },
    getLogs: async function(){ return []; },
    addLog: async function(){},
};
