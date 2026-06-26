const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'backend', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Add relations to Lead
if (!schema.includes('customerRequests CustomerRequest[]')) {
    schema = schema.replace(
        '  conversations   Conversation[]',
        '  conversations   Conversation[]\n  customerRequests CustomerRequest[]'
    );
}

// 2. Add relations to User
if (!schema.includes('assignedRequests     CustomerRequest[]')) {
    schema = schema.replace(
        '  passwordResetTokens  PasswordResetToken[]',
        '  passwordResetTokens  PasswordResetToken[]\n  assignedRequests     CustomerRequest[]     @relation("AssignedRequests")\n  activities           RequestActivity[]     @relation("ActorActivities")\n  internalNotes        InternalNote[]        @relation("AuthorNotes")'
    );
}

// 3. Add relations to Business
if (!schema.includes('notifications  Notification[]')) {
    schema = schema.replace(
        '  conversations  Conversation[]',
        '  conversations  Conversation[]\n  customerRequests CustomerRequest[]\n  notifications  Notification[]'
    );
}

// 4. Add relations to Conversation
if (!schema.includes('  customerRequests CustomerRequest[]')) {
    // There are multiple instances of "customerRequests CustomerRequest[]" now, 
    // but we can replace the last relations block.
    schema = schema.replace(
        '  lead            Lead?           @relation(fields: [leadId],            references: [id], onDelete: SetNull)',
        '  lead            Lead?           @relation(fields: [leadId],            references: [id], onDelete: SetNull)\n  customerRequests CustomerRequest[]'
    );
}

// 5. Append new models
const newModels = `
// =============================================================================
// PHASE 1 — CUSTOMER COMMUNICATION PLATFORM
// =============================================================================

model CustomerRequest {
  id              String   @id @default(uuid()) @db.Uuid
  businessId      String   @db.Uuid
  leadId          Int?
  conversationId  String?  @db.Uuid
  
  // Snapshots (only if no lead exists)
  snapshotName    String?  @db.VarChar(255)
  snapshotPhone   String?  @db.VarChar(50)
  snapshotEmail   String?  @db.VarChar(255)
  
  requestType     String   @db.VarChar(50)
  status          String   @default("NEW") @db.VarChar(50)
  priority        String   @default("MEDIUM") @db.VarChar(20)
  
  aiSummary       String?
  aiReason        String?
  suggestedAction String?

  assignedTo      String?  @db.Uuid

  createdAt       DateTime @default(now()) @db.Timestamptz
  updatedAt       DateTime @updatedAt @db.Timestamptz

  business        Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  lead            Lead?    @relation(fields: [leadId], references: [id], onDelete: SetNull)
  conversation    Conversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  assignedUser    User?    @relation("AssignedRequests", fields: [assignedTo], references: [id], onDelete: SetNull)

  activities      RequestActivity[]
  notes           InternalNote[]
  notifications   Notification[]

  @@index([businessId])
  @@index([status])
  @@index([priority])
  @@index([requestType])
  @@index([createdAt])
  @@map("customer_requests")
}

model RequestActivity {
  id              String   @id @default(uuid()) @db.Uuid
  requestId       String   @db.Uuid
  type            String   @db.VarChar(50)
  description     String
  actorId         String?  @db.Uuid
  createdAt       DateTime @default(now()) @db.Timestamptz
  
  request         CustomerRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  actor           User?           @relation("ActorActivities", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([requestId])
  @@index([createdAt])
  @@map("request_activities")
}

model InternalNote {
  id              String   @id @default(uuid()) @db.Uuid
  requestId       String   @db.Uuid
  authorId        String   @db.Uuid
  content         String
  createdAt       DateTime @default(now()) @db.Timestamptz
  
  request         CustomerRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  author          User            @relation("AuthorNotes", fields: [authorId], references: [id], onDelete: Cascade)

  @@index([requestId])
  @@index([createdAt])
  @@map("internal_notes")
}

model Notification {
  id               String   @id @default(uuid()) @db.Uuid
  businessId       String   @db.Uuid
  requestId        String?  @db.Uuid
  title            String
  description      String?
  notificationType String   @db.VarChar(50)
  priority         String   @default("MEDIUM") @db.VarChar(20)
  isRead           Boolean  @default(false)
  createdAt        DateTime @default(now()) @db.Timestamptz

  business         Business         @relation(fields: [businessId], references: [id], onDelete: Cascade)
  request          CustomerRequest? @relation(fields: [requestId], references: [id], onDelete: Cascade)

  @@index([businessId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}
`;

if (!schema.includes('model CustomerRequest {')) {
    schema += newModels;
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema updated successfully.');
