namespace DocuChat.Api.Models;

public class OpenAISettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string ChatModel { get; set; } = "gpt-4o";
    public string EmbeddingModel { get; set; } = "text-embedding-3-small";
}

public class AzureSearchSettings
{
    public string Endpoint { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string IndexName { get; set; } = "docuchat-index";
}

public class AzureBlobSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string ContainerName { get; set; } = "docuchat-documents";
}

public class SqlSettings
{
    public string ConnectionString { get; set; } = string.Empty;
}
