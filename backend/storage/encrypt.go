 

package storage

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
)

type EncryptedStore struct {
	ctx      context.Context
	fileName string
	secretKey []byte // 32-byte key for AES-256
}
type Storage struct {
}

func NewEncryptedStore() *EncryptedStore {
	// Simple static AES key representing secure device-level storage hardware
	key := []byte("u_must_protect_student_answers32") // 32 bytes
	return &EncryptedStore{
		fileName: "otapa_exam_recovery.dat",
		secretKey: key,
	}
}

func (e *EncryptedStore) Startup(ctx context.Context) {
	e.ctx = ctx
}

// SaveEncryptedExamState writes student answers safely to temp device folder
func (e *EncryptedStore) SaveEncryptedExamState(stateJson string) error {
	tempDir := os.TempDir()
	filePath := filepath.Join(tempDir, e.fileName)

	block, err := aes.NewCipher(e.secretKey)
	if err != nil {
		return err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(stateJson), nil)
	hexData := hex.EncodeToString(ciphertext)

	return os.WriteFile(filePath, []byte(hexData), 0600)
}

// LoadEncryptedExamState reads and decrypts local answers back to restore exam
func (e *EncryptedStore) LoadEncryptedExamState() (string, error) {
	tempDir := os.TempDir()
	filePath := filepath.Join(tempDir, e.fileName)

	if _, err := os.Stat(filePath); errors.Is(err, os.ErrNotExist) {
		return "", nil
	}

	hexData, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	ciphertext, err := hex.DecodeString(string(hexData))
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(e.secretKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("malformed encrypted state file")
	}

	nonce, actualCipher := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, actualCipher, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// SaveSecureToken caches user JWT inside a distinct AES-256 encrypter file
func (e *EncryptedStore) SaveSecureToken(token string) error {
	tempDir := os.TempDir()
	filePath := filepath.Join(tempDir, ".validex_session_token.enc")

	block, err := aes.NewCipher(e.secretKey)
	if err != nil {
		return err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(token), nil)
	hexData := hex.EncodeToString(ciphertext)

	return os.WriteFile(filePath, []byte(hexData), 0600)
}

// LoadSecureToken restores cached user credentials from isolated local directories
func (e *EncryptedStore) LoadSecureToken() (string, error) {
	tempDir := os.TempDir()
	filePath := filepath.Join(tempDir, ".validex_session_token.enc")

	if _, err := os.Stat(filePath); errors.Is(err, os.ErrNotExist) {
		return "", nil
	}

	hexData, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	ciphertext, err := hex.DecodeString(string(hexData))
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(e.secretKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("malformed encrypted token file")
	}

	nonce, actualCipher := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, actualCipher, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// ClearSecureToken deletes cached auth details on standard logout requests
func (e *EncryptedStore) ClearSecureToken() error {
	tempDir := os.TempDir()
	filePath := filepath.Join(tempDir, ".validex_session_token.enc")
	
	if _, err := os.Stat(filePath); err == nil {
		return os.Remove(filePath)
	}
	return nil
}

// ClearState deletes recovery files on successful submissions
func (e *EncryptedStore) ClearState() error {
	tempDir := os.TempDir()
	filePath := filepath.Join(tempDir, e.fileName)
	
	if _, err := os.Stat(filePath); err == nil {
		return os.Remove(filePath)
	}
	return nil
}




func (s *Storage) SaveAuthSession(data string) error {

	return os.WriteFile(
		"auth_session.json",
		[]byte(data),
		0600,
	)

}


func (s *Storage) LoadAuthSession() (string,error){

	data,err := os.ReadFile(
		"auth_session.json",
	)

	if err != nil {
		return "",nil
	}

	return string(data),nil

}


func (s *Storage) ClearAuthSession() error {

	err := os.Remove(
		"auth_session.json",
	)

	if os.IsNotExist(err){
		return nil
	}

	return err
}