import { db } from "../utils/db";

export const identifyConroller = async (req : any, res : any) => {
  const { email, phoneNumber } = req.body;

  const matchedContacts = await db.contact.findMany({
    where: {
      OR: [
        { email: email ?? undefined },
        { phoneNumber: phoneNumber ?? undefined }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  let primary = matchedContacts.find((c: { linkPrecedence: string; }) => c.linkPrecedence === 'primary') || matchedContacts[0];

  if (!matchedContacts.length) {
    const newContact = await db.contact.create({
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

  const knownEmails = new Set(matchedContacts.map((c: { email: any; }) => c.email).filter(Boolean));
  const knownPhones = new Set(matchedContacts.map((c: { phoneNumber: any; }) => c.phoneNumber).filter(Boolean));

  let shouldCreateNew = false;
  if (email && !knownEmails.has(email)) shouldCreateNew = true;
  if (phoneNumber && !knownPhones.has(phoneNumber)) shouldCreateNew = true;

  if (shouldCreateNew) {
    await db.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'secondary',
        linkedId: primary.id
      }
    });
  }

  const allLinkedContacts = await db.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  const emails = Array.from(new Set(allLinkedContacts.map((c: { email: any; }) => c.email).filter(Boolean)));
  const phoneNumbers = Array.from(new Set(allLinkedContacts.map((c: { phoneNumber: any; }) => c.phoneNumber).filter(Boolean)));
  const secondaryIds = allLinkedContacts.filter((c: { linkPrecedence: string; }) => c.linkPrecedence === 'secondary').map((c: { id: any; }) => c.id);

  res.status(200).json({
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryIds
    }
  });
}