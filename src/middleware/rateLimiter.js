const clients = {}

function rateLimit(ip, limit = 15, windowMs = 60 * 1000) {
    const now = Date.now();

    if (!clients[ip] || now > clients[ip].resetAt) {
        clients[ip] = {
            count:1, 
            resetAt:now + windowMs
        };

        return { 
            allowed: true, 
            remaining: limit - 1 
        };
    }

    if(clients[ip].count < limit){
        clients[ip].count++;
        return {
            allowed: true,
             remaining: limit - clients[ip].count
        }
    }

    const retryAfter = Math.ceil((clients[ip].resetAt - now) / 1000);
    return { 
        allowed: false, 
        retryAfter 
    };

}

export { rateLimit };