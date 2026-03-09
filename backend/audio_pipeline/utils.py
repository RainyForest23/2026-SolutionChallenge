# 유틸리티 함수들: 명령어 실행, 디렉토리 생성, 시스템에서 바이너리 위치 찾기 등
from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


@dataclass
class CmdResult:
    cmd: List[str]
    returncode: int
    stdout: str
    stderr: str

# 시스템에서 특정 바이너리의 위치를 찾는 유틸리티 함수
def which(bin_name: str) -> Optional[str]:
    return shutil.which(bin_name)

# 디렉토리가 존재하지 않으면 생성하는 유틸리티 함수
def ensure_dir(path: str | Path) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p

# 명령어를 실행하고 결과를 캡처하는 유틸리티 함수
def run_cmd(cmd: List[str], cwd: str | Path | None = None) -> CmdResult:
    """
    Run a command and capture stdout/stderr for logging/debugging.
    """
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    return CmdResult(cmd=cmd, returncode=proc.returncode, stdout=proc.stdout, stderr=proc.stderr)