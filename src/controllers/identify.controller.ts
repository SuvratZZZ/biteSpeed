import { db } from "../utils/db";

export const identifyConroller = async (req: any, res: any) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber required." });
  }

  const orConditions = [];
  if (email) orConditions.push({ email });
  if (phoneNumber) orConditions.push({ phoneNumber });

  const initialMatches = await db.contact.findMany({
    where: {
      OR: orConditions,
    },
    orderBy: { createdAt: "asc" },
  });

  if (initialMatches.length === 0) {
    const newContact = await db.contact.create({
      data: { email, phoneNumber, linkPrecedence: "primary" },
    });
    return res.status(200).json({
      contact: {
        primaryContatctId: newContact.id,
        emails: [newContact.email].filter(Boolean),
        phoneNumbers: [newContact.phoneNumber].filter(Boolean),
        secondaryContactIds: [],
      },
    });
  }

  const visited = new Set<number>();
  const allContacts: any[] = [];
  const queue: number[] = [];

  for (const c of initialMatches) {
    if (!visited.has(c.id)) queue.push(c.id);
  }

  while (queue.length > 0) {
    const currentId = queue.pop()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const relatedContacts = await db.contact.findMany({
      where: {
        OR: [
          { id: currentId },
          { linkedId: currentId },
          { id: (await db.contact.findUnique({ where: { id: currentId } }))?.linkedId || -1 }
        ]
      },
    });

    for (const c of relatedContacts) {
      if (!visited.has(c.id)) queue.push(c.id);
      allContacts.push(c);
    }
  }

  const uniqueContacts = Array.from(
    new Map(allContacts.map(c => [c.id, c])).values()
  );

  uniqueContacts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const primary = uniqueContacts.find(c => c.linkPrecedence === "primary")!;
  const primaryId = primary.id;

  for (const c of uniqueContacts) {
    if (c.linkPrecedence === "primary" && c.id !== primaryId) {
      await db.contact.update({
        where: { id: c.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: primaryId,
        },
      });
    }
  }
  const emails = new Set(uniqueContacts.map(c => c.email).filter(Boolean));
  const phones = new Set(uniqueContacts.map(c => c.phoneNumber).filter(Boolean));

  if ((email && !emails.has(email)) || (phoneNumber && !phones.has(phoneNumber))) {
    await db.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "secondary",
        linkedId: primaryId,
      },
    });
  }

  const finalContacts = await db.contact.findMany({
    where: {
      OR: [{ id: primaryId }, { linkedId: primaryId }],
    },
    orderBy: { createdAt: "asc" },
  });

  return res.status(200).json({
    contact: {
      primaryContatctId: primaryId,
      emails: Array.from(new Set(finalContacts.map(c => c.email).filter(Boolean))),
      phoneNumbers: Array.from(new Set(finalContacts.map(c => c.phoneNumber).filter(Boolean))),
      secondaryContactIds: finalContacts
        .filter(c => c.linkPrecedence === "secondary")
        .map(c => c.id),
    },
  });
};
