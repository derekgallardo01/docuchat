-- DocuChat Platform - Initial Schema
-- Run against: rg-operations-tracker-server-2.database.windows.net / docuchat-db

-- Conversations
CREATE TABLE Conversations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Title NVARCHAR(200) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Chat Messages
CREATE TABLE ChatMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ConversationId UNIQUEIDENTIFIER NOT NULL,
    Role NVARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    Content NVARCHAR(MAX) NOT NULL,
    TokensUsed INT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ChatMessages_Conversations FOREIGN KEY (ConversationId)
        REFERENCES Conversations(Id) ON DELETE CASCADE
);

CREATE INDEX IX_ChatMessages_ConversationId ON ChatMessages(ConversationId);

-- Documents (uploaded files)
CREATE TABLE Documents (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FileName NVARCHAR(500) NOT NULL,
    ContentType NVARCHAR(100) NOT NULL,
    BlobUri NVARCHAR(2000) NOT NULL,
    FileSizeBytes BIGINT NOT NULL,
    ChunkCount INT NOT NULL DEFAULT 0,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Processing, Ready, Failed
    ErrorMessage NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Document Chunks (for tracking what's indexed)
CREATE TABLE DocumentChunks (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DocumentId UNIQUEIDENTIFIER NOT NULL,
    ChunkIndex INT NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    TokenCount INT NOT NULL,
    SearchDocumentId NVARCHAR(200) NOT NULL, -- ID in Azure AI Search
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_DocumentChunks_Documents FOREIGN KEY (DocumentId)
        REFERENCES Documents(Id) ON DELETE CASCADE
);

CREATE INDEX IX_DocumentChunks_DocumentId ON DocumentChunks(DocumentId);

-- Message Sources (which chunks were used to answer)
CREATE TABLE MessageSources (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ChatMessageId UNIQUEIDENTIFIER NOT NULL,
    DocumentId UNIQUEIDENTIFIER NOT NULL,
    ChunkId UNIQUEIDENTIFIER NOT NULL,
    FileName NVARCHAR(500) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    RelevanceScore FLOAT NOT NULL,
    CONSTRAINT FK_MessageSources_ChatMessages FOREIGN KEY (ChatMessageId)
        REFERENCES ChatMessages(Id) ON DELETE CASCADE,
    CONSTRAINT FK_MessageSources_Documents FOREIGN KEY (DocumentId)
        REFERENCES Documents(Id)
);

CREATE INDEX IX_MessageSources_ChatMessageId ON MessageSources(ChatMessageId);
