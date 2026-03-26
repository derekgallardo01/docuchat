using RagChat.Api.Hubs;
using RagChat.Api.Models;
using RagChat.Api.Repositories;
using RagChat.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Load .env file for local development
var envFile = Path.Combine(builder.Environment.ContentRootPath, "..", "..", ".env");
if (File.Exists(envFile))
{
    foreach (var line in File.ReadAllLines(envFile))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#')) continue;
        var parts = line.Split('=', 2);
        if (parts.Length == 2)
            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
    }
}

// Configuration from environment variables
var openAISettings = new OpenAISettings
{
    ApiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? "",
    ChatModel = Environment.GetEnvironmentVariable("OPENAI_CHAT_MODEL") ?? "gpt-4o",
    EmbeddingModel = Environment.GetEnvironmentVariable("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small"
};

var searchSettings = new AzureSearchSettings
{
    Endpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT") ?? "",
    ApiKey = Environment.GetEnvironmentVariable("AZURE_SEARCH_API_KEY") ?? "",
    IndexName = Environment.GetEnvironmentVariable("AZURE_SEARCH_INDEX_NAME") ?? "ragchat-index"
};

var blobSettings = new AzureBlobSettings
{
    ConnectionString = Environment.GetEnvironmentVariable("AZURE_BLOB_CONNECTION_STRING") ?? "",
    ContainerName = Environment.GetEnvironmentVariable("AZURE_BLOB_CONTAINER_NAME") ?? "ragchat-documents"
};

var sqlSettings = new SqlSettings
{
    ConnectionString = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING") ?? ""
};

// Register settings as singletons
builder.Services.AddSingleton(openAISettings);
builder.Services.AddSingleton(searchSettings);
builder.Services.AddSingleton(blobSettings);
builder.Services.AddSingleton(sqlSettings);

// Register services
builder.Services.AddSingleton<IOpenAIService, OpenAIService>();
builder.Services.AddSingleton<ISearchService, SearchService>();
builder.Services.AddSingleton<IBlobStorageService, BlobStorageService>();
builder.Services.AddScoped<IDocumentProcessingService, DocumentProcessingService>();
builder.Services.AddScoped<IChatService, ChatService>();

// Register repositories
builder.Services.AddScoped<IConversationRepository, ConversationRepository>();
builder.Services.AddScoped<IChatMessageRepository, ChatMessageRepository>();
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();

// Add framework services
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowUI", policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials());
});

var app = builder.Build();

// Ensure search index exists on startup
using (var scope = app.Services.CreateScope())
{
    var searchService = scope.ServiceProvider.GetRequiredService<ISearchService>();
    await searchService.EnsureIndexAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.MapOpenApi();
}

app.UseCors("AllowUI");
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
