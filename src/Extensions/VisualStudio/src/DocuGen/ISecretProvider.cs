using System.Threading.Tasks;

public interface ISecretProvider
{
    Task<string> GetSecret(string secretName);
}
