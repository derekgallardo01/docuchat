using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using DocuChat.Api.Models;

namespace DocuChat.Api.Services;

public interface IBlobStorageService
{
    Task<string> UploadAsync(string fileName, Stream content, string contentType, CancellationToken ct = default);
    Task<Stream> DownloadAsync(string blobUri, CancellationToken ct = default);
    Task DeleteAsync(string blobUri, CancellationToken ct = default);
}

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobContainerClient _containerClient;

    public BlobStorageService(AzureBlobSettings settings)
    {
        var blobServiceClient = new BlobServiceClient(settings.ConnectionString);
        _containerClient = blobServiceClient.GetBlobContainerClient(settings.ContainerName);
    }

    public async Task<string> UploadAsync(string fileName, Stream content, string contentType, CancellationToken ct = default)
    {
        await _containerClient.CreateIfNotExistsAsync(cancellationToken: ct);

        var blobName = $"{Guid.NewGuid()}/{fileName}";
        var blobClient = _containerClient.GetBlobClient(blobName);

        await blobClient.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);
        return blobClient.Uri.ToString();
    }

    public async Task<Stream> DownloadAsync(string blobUri, CancellationToken ct = default)
    {
        var blobName = ExtractBlobName(blobUri);
        var blobClient = _containerClient.GetBlobClient(blobName);
        var response = await blobClient.DownloadStreamingAsync(cancellationToken: ct);
        return response.Value.Content;
    }

    public async Task DeleteAsync(string blobUri, CancellationToken ct = default)
    {
        var blobName = ExtractBlobName(blobUri);
        var blobClient = _containerClient.GetBlobClient(blobName);
        await blobClient.DeleteIfExistsAsync(cancellationToken: ct);
    }

    private string ExtractBlobName(string blobUri)
    {
        // URI: https://account.blob.core.windows.net/container/path/to/blob
        // AbsolutePath: /container/path/to/blob
        var uri = new Uri(blobUri);
        var containerPrefix = $"/{_containerClient.Name}/";
        var path = Uri.UnescapeDataString(uri.AbsolutePath);
        return path.StartsWith(containerPrefix)
            ? path[containerPrefix.Length..]
            : path.TrimStart('/');
    }
}
