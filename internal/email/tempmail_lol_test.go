package email

import (
	"testing"
)

func TestTempMailLolClient_CreateInbox(t *testing.T) {
	config := TempMailLolConfig{
		Name: "test",
	}

	client := NewTempMailLolClient(config)
	inbox, err := client.CreateInbox()
	if err != nil {
		t.Fatalf("创建收件箱失败: %v", err)
	}

	if inbox.Address == "" {
		t.Error("邮箱地址为空")
	}

	if inbox.Token == "" {
		t.Error("Token 为空")
	}

	t.Logf("创建成功: %s (Token: %s)", inbox.Address, inbox.Token)
}

func TestTempMailLolProvider_GetAddress(t *testing.T) {
	config := TempMailLolConfig{
		Name: "test",
	}

	provider, err := NewTempMailLolProvider(config)
	if err != nil {
		t.Fatalf("创建提供商失败: %v", err)
	}

	address := provider.GetAddress()
	if address == "" {
		t.Error("邮箱地址为空")
	}

	t.Logf("邮箱地址: %s", address)
}
