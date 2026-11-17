"""FTP / SFTP: download or upload files. Implementation: step 9."""

from typing import Literal

from pydantic import SecretStr

from sosuv.nodes import BaseNode, FileRef, NodeContext, NodeOutput, NodeSettings, register_node, setting


class FtpSettings(NodeSettings):
    action: Literal["download", "upload"] = setting("download", label="Action")
    protocol: Literal["sftp", "ftp"] = setting("sftp", label="Protocol")
    host: str = setting(label="Server", placeholder="ftp.vendor.com")
    port: int = setting(22, label="Port", ge=1, le=65535)
    username: str = setting(label="Username")
    password: SecretStr | None = setting(None, label="Password", help="Stored encrypted on the server.")
    remote_folder: str = setting(label="Remote folder", placeholder="/outbound")
    file_pattern: str = setting("*", label="File pattern", placeholder="daily_*.xlsx")
    local_path: str = setting("", label="Local folder", placeholder="incoming/")


class FtpOutput(NodeOutput):
    files: list[FileRef]
    count: int


@register_node
class FtpNode(BaseNode[FtpSettings, FtpOutput]):
    type = "ftp"
    name = "FTP / SFTP"
    description = "Download files from, or upload files to, an FTP or SFTP server."
    icon = "server"
    color = "#2563eb"
    category = "Files"

    async def run(self, ctx: NodeContext, settings: FtpSettings) -> FtpOutput:
        raise NotImplementedError("FTP/SFTP transfer is implemented in step 9")
