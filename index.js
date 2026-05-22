import express from 'express';
import http from 'node:http';
import { createBareServer } from '@tomphttp/bare-server-node';
import cors from 'cors';
import path from "path";
import { fileURLToPath } from 'url';
import { hostname } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer();
const app = express(server);
const bareServer = createBareServer('/bare/');
const PORT = process.env.PORT || 5505;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Remove iframe-blocking headers
app.use((req, res, next) => {
    const originalSetHeader = res.setHeader;
    res.setHeader = function(name, value) {
        const lowerName = name.toLowerCase();
        if (lowerName === 'x-frame-options') {
            return;
        }
        if (lowerName === 'content-security-policy' && value && value.includes('frame-ancestors')) {
            return;
        }
        return originalSetHeader.call(this, name, value);
    };
    next();
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/devs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'developers&partners.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/roadmap', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'roadmap.html'));
});

app.get('/games', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'games.html'));
});

app.get('/discord', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'discord.html'));
});

// IMPORTANT: UV and bare routes must be handled BEFORE the catch-all
// The bare server handles its own routing
server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log("Listening on:");
    console.log(`\thttp://localhost:${address.port}`);
    console.log(`\thttp://${hostname()}:${address.port}`);
});

server.listen(PORT);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
    console.log("Closing server...");
    server.close();
    bareServer.close();
    process.exit(0);
}
