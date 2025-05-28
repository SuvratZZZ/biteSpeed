export const identifyConroller = async (req : any, res : any) => {
  const { email, phoneNumber } = req.body;

  const matchedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email ?? undefined },
        { phoneNumber: phoneNumber ?? undefined }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  let primary = matchedContacts.find(c => c.linkPrecedence === 'primary') || matchedContacts[0];

  if (!matchedContacts.length) {
    const newContact = await prisma.contact.create({
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

  const knownEmails = new Set(matchedContacts.map(c => c.email).filter(Boolean));
  const knownPhones = new Set(matchedContacts.map(c => c.phoneNumber).filter(Boolean));

  let shouldCreateNew = false;
  if (email && !knownEmails.has(email)) shouldCreateNew = true;
  if (phoneNumber && !knownPhones.has(phoneNumber)) shouldCreateNew = true;

  if (shouldCreateNew) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'secondary',
        linkedId: primary.id
      }
    });
  }

  const allLinkedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  const emails = Array.from(new Set(allLinkedContacts.map(c => c.email).filter(Boolean)));
  const phoneNumbers = Array.from(new Set(allLinkedContacts.map(c => c.phoneNumber).filter(Boolean)));
  const secondaryIds = allLinkedContacts.filter(c => c.linkPrecedence === 'secondary').map(c => c.id);

  res.status(200).json({
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryIds
    }
  });
}