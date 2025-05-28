"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const identify_router_1 = __importDefault(require("./routes/identify.router"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/identify', identify_router_1.default);
app.use('/', (req, res) => {
    return res.send("BITESPEED route => /indentify");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
