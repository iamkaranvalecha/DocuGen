﻿namespace DocuGen
{
    [Command(PackageIds.MyCommand)]
    internal sealed class MyCommand : BaseCommand<MyCommand>
    {
        protected override async Task ExecuteAsync(OleMenuCmdEventArgs e)
        {
            await DocuGenToolWindow.ShowAsync();
        }
    }
}
