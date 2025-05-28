"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyConroller = void 0;
const db_1 = require("../utils/db");
const identifyConroller = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, phoneNumber } = req.body;
    const matchedContacts = yield db_1.db.contact.findMany({
        where: {
            OR: [
                { email: email !== null && email !== void 0 ? email : undefined },
                { phoneNumber: phoneNumber !== null && phoneNumber !== void 0 ? phoneNumber : undefined }
            ]
        },
        orderBy: { createdAt: 'asc' }
    });
    let primary = matchedContacts.find((c) => c.linkPrecedence === 'primary') || matchedContacts[0];
    if (!matchedContacts.length) {
        const newContact = yield db_1.db.contact.create({
            data: {
                email,
                phoneNumber,
                linkPrecedence: 'primary'
            }
        });
        return res.status(200).json({
            contact: {
                primaryContatctId: newContact.id,
                emails: [newContact.email].filter(Boolean),
                phoneNumbers: [newContact.phoneNumber].filter(Boolean),
                secondaryContactIds: []
            }
        });
    }
    const knownEmails = new Set(matchedContacts.map((c) => c.email).filter(Boolean));
    const knownPhones = new Set(matchedContacts.map((c) => c.phoneNumber).filter(Boolean));
    let shouldCreateNew = false;
    if (email && !knownEmails.has(email))
        shouldCreateNew = true;
    if (phoneNumber && !knownPhones.has(phoneNumber))
        shouldCreateNew = true;
    if (shouldCreateNew) {
        yield db_1.db.contact.create({
            data: {
                email,
                phoneNumber,
                linkPrecedence: 'secondary',
                linkedId: primary.id
            }
        });
    }
    const allLinkedContacts = yield db_1.db.contact.findMany({
        where: {
            OR: [
                { id: primary.id },
                { linkedId: primary.id }
            ]
        },
        orderBy: { createdAt: 'asc' }
    });
    const emails = Array.from(new Set(allLinkedContacts.map((c) => c.email).filter(Boolean)));
    const phoneNumbers = Array.from(new Set(allLinkedContacts.map((c) => c.phoneNumber).filter(Boolean)));
    const secondaryIds = allLinkedContacts.filter((c) => c.linkPrecedence === 'secondary').map((c) => c.id);
    res.status(200).json({
        contact: {
            primaryContatctId: primary.id,
            emails,
            phoneNumbers,
            secondaryContactIds: secondaryIds
        }
    });
});
exports.identifyConroller = identifyConroller;
