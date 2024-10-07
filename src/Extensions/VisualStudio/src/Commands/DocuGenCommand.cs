namespace DocuGen_CommunityToolkit
{
    [Command(PackageIds.DocuGenCommand)]
    internal sealed class DocuGenCommand : BaseCommand<DocuGenCommand>
    {
        protected override async Task ExecuteAsync(OleMenuCmdEventArgs e) =>
        await DocuGenToolWindow.ShowAsync();
    }
}
